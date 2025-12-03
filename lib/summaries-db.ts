"use server";

import { createClient } from "@/lib/supabase/server";

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
      .from('callsummaries')
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
      .from('callsummaries')
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

// Get user's role
async function getUserRole(userId: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    
    // First try to get role from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (!userError && userData?.role) {
      return userData.role;
    }

    // Fallback: try to get role from user_metadata
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!authError && user) {
      const role = user.user_metadata?.role || user.app_metadata?.role;
      if (role) {
        return role;
      }
    }

    // Default to 'sales' if no role found
    return 'sales';
  } catch (error) {
    console.error('Error getting user role:', error);
    // Default to 'sales' on error
    return 'sales';
  }
}

// Fetch summaries with role-based access
export async function fetchSummaries(): Promise<{ success: boolean; data?: SummaryWithUser[]; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get user role
    const role = await getUserRole(user.id);
    
    // Build query - try to join with users table if it exists, otherwise just get summaries
    let query = supabase
      .from('callsummaries')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply role-based filtering
    if (role === 'admin' || role === 'sales-support') {
      // Admin and sales-support can see all summaries
      // No filter needed
    } else {
      // Sales can only see their own summaries
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query;

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
      .from('callsummaries')
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

