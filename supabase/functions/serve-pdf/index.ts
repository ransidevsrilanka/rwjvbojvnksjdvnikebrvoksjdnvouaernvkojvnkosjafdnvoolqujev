import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Tier hierarchy for access control
const TIER_HIERARCHY: Record<string, number> = {
  'starter': 1,
  'standard': 2,
  'lifetime': 3,
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Get auth token from request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', code: 'NO_AUTH' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create client with user's token for RLS
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })

    // Verify user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      console.error('Auth error:', userError)
      return new Response(
        JSON.stringify({ error: 'Authentication failed', code: 'AUTH_FAILED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { noteId } = await req.json()
    if (!noteId) {
      return new Response(
        JSON.stringify({ error: 'Note ID required', code: 'MISSING_NOTE_ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use service role for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Get note details
    const { data: note, error: noteError } = await supabaseAdmin
      .from('notes')
      .select('id, title, file_url, min_tier, is_active, topic_id')
      .eq('id', noteId)
      .single()

    if (noteError || !note) {
      console.error('Note fetch error:', noteError)
      return new Response(
        JSON.stringify({ error: 'Note not found', code: 'NOTE_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!note.is_active) {
      return new Response(
        JSON.stringify({ error: 'Note is not available', code: 'NOTE_INACTIVE' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!note.file_url) {
      return new Response(
        JSON.stringify({ error: 'No file associated with this note', code: 'NO_FILE' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get topic info
    const { data: topic, error: topicError } = await supabaseAdmin
      .from('topics')
      .select('id, subject_id')
      .eq('id', note.topic_id)
      .single()

    if (topicError || !topic) {
      console.error('Topic fetch error:', topicError)
      return new Response(
        JSON.stringify({ error: 'Content structure error', code: 'TOPIC_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get subject info
    const { data: subjectData, error: subjectError } = await supabaseAdmin
      .from('subjects')
      .select('id, grade, stream, medium')
      .eq('id', topic.subject_id)
      .single()

    if (subjectError || !subjectData) {
      console.error('Subject fetch error:', subjectError)
      return new Response(
        JSON.stringify({ error: 'Content structure error', code: 'SUBJECT_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin (admins have full access)
    const { data: isAdmin } = await supabaseAdmin.rpc('is_admin', { _user_id: user.id })

    if (!isAdmin) {
      // Get user's enrollment for this grade/stream/medium
      const { data: enrollment, error: enrollmentError } = await supabaseAdmin
        .from('enrollments')
        .select('tier, expires_at, is_active')
        .eq('user_id', user.id)
        .eq('grade', subjectData.grade)
        .eq('stream', subjectData.stream)
        .eq('medium', subjectData.medium)
        .eq('is_active', true)
        .maybeSingle()

      if (enrollmentError) {
        console.error('Enrollment fetch error:', enrollmentError)
        return new Response(
          JSON.stringify({ error: 'Failed to verify access', code: 'ACCESS_CHECK_FAILED' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!enrollment) {
        return new Response(
          JSON.stringify({ 
            error: 'No enrollment found for this content',
            code: 'NO_ENROLLMENT',
            details: { grade: subjectData.grade, stream: subjectData.stream, medium: subjectData.medium }
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check expiration
      if (enrollment.expires_at && new Date(enrollment.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Your enrollment has expired', code: 'ENROLLMENT_EXPIRED' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check tier access
      const userTierLevel = TIER_HIERARCHY[enrollment.tier] || 0
      const requiredTierLevel = TIER_HIERARCHY[note.min_tier] || 0

      if (userTierLevel < requiredTierLevel) {
        return new Response(
          JSON.stringify({ 
            error: 'Your tier does not have access to this content',
            code: 'TIER_INSUFFICIENT',
            details: { userTier: enrollment.tier, requiredTier: note.min_tier }
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Extract file path from URL
    let filePath = note.file_url
    
    if (filePath.includes('/storage/v1/object/')) {
      const match = filePath.match(/\/storage\/v1\/object\/(?:public|sign)\/notes\/(.+)/)
      if (match) {
        filePath = match[1]
      }
    } else if (filePath.startsWith('notes/')) {
      filePath = filePath.replace('notes/', '')
    }

    // Generate short-lived signed URL (5 minutes)
    const { data: signedData, error: signedError } = await supabaseAdmin
      .storage
      .from('notes')
      .createSignedUrl(filePath, 300)

    if (signedError || !signedData?.signedUrl) {
      console.error('Signed URL error:', signedError)
      return new Response(
        JSON.stringify({ error: 'Failed to generate access URL', code: 'SIGNED_URL_FAILED' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user profile for enhanced watermark
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name, downloads_disabled')
      .eq('user_id', user.id)
      .single()

    // Check if downloads are disabled globally or for this user
    const { data: downloadSettings } = await supabaseAdmin
      .from('site_settings')
      .select('value')
      .eq('key', 'download_settings')
      .single()

    const globalDownloadsEnabled = downloadSettings?.value?.globalEnabled !== false
    const userDownloadsDisabled = profile?.downloads_disabled === true
    const disabledUsersList = downloadSettings?.value?.disabledUsers || []
    const isUserInDisabledList = disabledUsersList.includes(user.id)

    // Determine if user can download (only standard and lifetime tiers)
    // Get user's enrollment tier for download permission
    const { data: enrollment } = await supabaseAdmin
      .from('enrollments')
      .select('tier')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    const userTier = enrollment?.tier || 'starter'
    const tierAllowsDownload = TIER_HIERARCHY[userTier] >= 2 // standard or lifetime only
    const canDownload = globalDownloadsEnabled && 
                        !userDownloadsDisabled && 
                        !isUserInDisabledList && 
                        tierAllowsDownload

    // Log this access attempt
    await supabaseAdmin.from('download_logs').insert({
      user_id: user.id,
      note_id: noteId,
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
      file_name: note.title
    })

    console.log(`PDF access granted: user=${user.id}, note=${noteId}, canDownload=${canDownload}`)

    // Generate timestamp for watermark
    const accessTimestamp = new Date().toISOString()

    return new Response(
      JSON.stringify({
        signedUrl: signedData.signedUrl,
        expiresIn: 300,
        canDownload: canDownload,
        watermark: {
          fullName: profile?.full_name || 'User',
          email: profile?.email || user.email,
          oderId: user.id.slice(0, 8).toUpperCase(),
          timestamp: accessTimestamp,
          userId: user.id
        },
        noteTitle: note.title
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        } 
      }
    )

  } catch (error) {
    console.error('Serve PDF error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
