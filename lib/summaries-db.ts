"use server";

import { createClient } from "@/lib/supabase/server";
import { getUserRole as getUserRoleFromTable, type UserRole } from "@/lib/user-roles";

export interface SummaryData {
  id?: string;
  user_id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  transcript: string;
  summary: string;
  language: 'german' | 'english';
  created_at?: string;
  updated_at?: string;
}

export interface SummaryWithUser extends SummaryData {
  user_email?: string;
  user_name?: string;
}

// Save summary to database
export async function saveSummary(data: Omit<SummaryData, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: summary, error } = await supabase
      .from('sales_summaries')
      .insert({
        user_id: data.user_id,
        customer_name: data.customer_name,
        customer_email: data.customer_email || null,
        customer_phone: data.customer_phone || null,
        transcript: data.transcript,
        summary: data.summary,
        language: data.language
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error saving summary:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: summary.id };
  } catch (error) {
    console.error('Error saving summary:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to save summary' 
    };
  }
}

// Update summary
export async function updateSummary(id: string, updates: Partial<SummaryData>): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('sales_summaries')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating summary:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating summary:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update summary' 
    };
  }
}

// Get user's role - using the user-roles helper function (server version)
async function getUserRole(userId: string): Promise<string | null> {
  try {
    // Use the helper function from user-roles.ts with server client flag
    const role = await getUserRoleFromTable(userId, true);
    return role;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

// Fetch summaries - only returns the current logged-in user's summaries
// This is used for the History tab, which should only show the user's own summaries
export async function fetchSummaries(): Promise<{ success: boolean; data?: SummaryWithUser[]; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Always filter by current user's ID - History tab should only show user's own summaries
    const { data, error } = await supabase
      .from('sales_summaries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching summaries:', error);
      return { success: false, error: error.message };
    }

    // Transform data - user info will be populated if available from a users table join
    // For now, we'll just show user_id and let the frontend handle user lookup if needed
    const summaries: SummaryWithUser[] = (data || []).map((item: any) => ({
      id: item.id,
      user_id: item.user_id,
      customer_name: item.customer_name,
      customer_email: item.customer_email,
      customer_phone: item.customer_phone,
      transcript: item.transcript,
      summary: item.summary,
      language: item.language,
      created_at: item.created_at,
      updated_at: item.updated_at,
      user_email: item.user_email || item.user?.email || '',
      user_name: item.user_name || item.user?.user_metadata?.full_name || item.user?.user_metadata?.name || ''
    }));

    return { success: true, data: summaries };
  } catch (error) {
    console.error('Error fetching summaries:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch summaries' 
    };
  }
}

// Fetch summaries for "View Summaries" tab
// RLS policies handle the role-based filtering automatically
// Excludes current user's own summaries (those are in History tab)
export async function fetchAllSummariesForView(): Promise<{ success: boolean; data?: SummaryWithUser[]; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get all summaries (excluding current user's own summaries)
    // RLS policies will automatically filter based on user's role
    const { data: summariesData, error: summariesError } = await supabase
      .from('sales_summaries')
      .select('*')
      .neq('user_id', user.id) // Exclude current user's own summaries
      .order('created_at', { ascending: false });
    
    if (summariesError) {
      console.error('Error fetching summaries:', summariesError);
      return { success: false, error: summariesError.message };
    }

    if (!summariesData || summariesData.length === 0) {
      return { success: true, data: [] };
    }

    // Get unique user IDs from summaries (RLS has already filtered them)
    const uniqueUserIds = [...new Set(summariesData.map((s: any) => s.user_id))];
    console.log('uniqueUserIds', uniqueUserIds);
    // Fetch profiles for the user IDs (RLS will filter profiles based on access)
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email');
      // .in('id', uniqueUserIds);
    console.log('profilesData', profilesData);
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      // Continue without profile data if profiles can't be fetched
    }

    // Create a map of user_id -> profile for quick lookup
    const profileMap = new Map<string, any>();
    if (profilesData) {
      profilesData.forEach((profile: any) => {
        profileMap.set(profile.id, profile);
      });
    }

    // Transform data with profile information
    const summaries: SummaryWithUser[] = summariesData.map((item: any) => {
      const profile = profileMap.get(item.user_id);
      const userName = profile?.first_name && profile?.last_name
        ? `${profile.first_name} ${profile.last_name}`
        : profile?.first_name || profile?.last_name || profile?.email || 'Unknown User';
      
      return {
        id: item.id,
        user_id: item.user_id,
        customer_name: item.customer_name,
        customer_email: item.customer_email,
        customer_phone: item.customer_phone,
        transcript: item.transcript,
        summary: item.summary,
        language: item.language,
        created_at: item.created_at,
        updated_at: item.updated_at,
        user_email: profile?.email || '',
        user_name: userName
      };
    });

    return { success: true, data: summaries };
  } catch (error) {
    console.error('Error fetching summaries for view:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch summaries' 
    };
  }
}

// Delete summary
export async function deleteSummary(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get user role
    const role = await getUserRole(user.id);
    
    // Build query
    let query = supabase
      .from('sales_summaries')
      .delete()
      .eq('id', id);

    // Sales can only delete their own summaries
    if (role !== 'admin' && role !== 'sales-support') {
      query = query.eq('user_id', user.id);
    }

    const { error } = await query;

    if (error) {
      console.error('Error deleting summary:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting summary:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete summary' 
    };
  }
}

