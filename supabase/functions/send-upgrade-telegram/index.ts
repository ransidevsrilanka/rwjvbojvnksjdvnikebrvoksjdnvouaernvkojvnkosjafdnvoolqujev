import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { upgradeRequestId } = await req.json();
    
    if (!upgradeRequestId) {
      throw new Error('upgradeRequestId is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const telegramChatId = Deno.env.get('TELEGRAM_CHAT_ID');

    if (!telegramBotToken || !telegramChatId) {
      console.error('Telegram credentials not configured');
      throw new Error('Telegram credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch upgrade request with user profile
    const { data: request, error: requestError } = await supabase
      .from('upgrade_requests')
      .select('*')
      .eq('id', upgradeRequestId)
      .single();

    if (requestError || !request) {
      console.error('Failed to fetch upgrade request:', requestError);
      throw new Error('Upgrade request not found');
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', request.user_id)
      .single();

    const userName = profile?.full_name || profile?.email || 'Unknown User';
    const userEmail = profile?.email || 'No email';

    // Format tier names
    const tierLabels: Record<string, string> = {
      starter: 'Starter (Silver)',
      standard: 'Standard (Gold)',
      lifetime: 'Lifetime (Platinum)',
    };

    const currentTier = tierLabels[request.current_tier] || request.current_tier;
    const requestedTier = tierLabels[request.requested_tier] || request.requested_tier;

    // Build message
    const message = `📤 *New Upgrade Request*

👤 *User:* ${userName}
📧 *Email:* ${userEmail}

💳 *Current Tier:* ${currentTier}
⬆️ *Requested Tier:* ${requestedTier}
💰 *Amount:* Rs. ${Number(request.amount).toLocaleString()}

🔖 *Reference:* \`${request.reference_number}\`
📅 *Date:* ${new Date(request.created_at).toLocaleString('en-LK')}`;

    // Send text message first
    const sendMessageUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
    const messageResponse = await fetch(sendMessageUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    if (!messageResponse.ok) {
      const errorText = await messageResponse.text();
      console.error('Failed to send Telegram message:', errorText);
      throw new Error('Failed to send Telegram message');
    }

    console.log('Telegram message sent successfully');

    // If receipt exists, download and send as photo
    if (request.receipt_url) {
      console.log('Attempting to download receipt from storage path:', request.receipt_url);
      
      // First check if file exists by listing
      const { data: listData, error: listError } = await supabase.storage
        .from('receipts')
        .list(request.receipt_url.split('/').slice(0, -1).join('/'));
      
      console.log('Storage list result:', { listData, listError });
      
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('receipts')
        .download(request.receipt_url);

      if (downloadError) {
        console.error('Failed to download receipt:', downloadError);
        console.error('Download error details:', JSON.stringify(downloadError));
      } else if (fileData) {
        console.log('Receipt downloaded successfully, size:', fileData.size, 'type:', fileData.type);
        
        // Convert to buffer
        const arrayBuffer = await fileData.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Determine content type from file or extension
        const extension = request.receipt_url.split('.').pop()?.toLowerCase();
        let contentType = fileData.type || 'image/jpeg';
        if (extension === 'png') contentType = 'image/png';
        else if (extension === 'pdf') contentType = 'application/pdf';
        else if (extension === 'jpg' || extension === 'jpeg') contentType = 'image/jpeg';
        
        console.log('Sending receipt to Telegram, contentType:', contentType, 'extension:', extension);
        
        // Send as photo or document
        const formData = new FormData();
        formData.append('chat_id', telegramChatId);
        formData.append('caption', `Receipt for ${request.reference_number}\nUser: ${userEmail}`);
        
        const blob = new Blob([uint8Array], { type: contentType });
        
        if (extension === 'pdf') {
          formData.append('document', blob, `receipt_${request.reference_number}.pdf`);
          const sendDocUrl = `https://api.telegram.org/bot${telegramBotToken}/sendDocument`;
          console.log('Sending PDF document to Telegram...');
          const docResponse = await fetch(sendDocUrl, {
            method: 'POST',
            body: formData,
          });
          const docResult = await docResponse.text();
          if (!docResponse.ok) {
            console.error('Failed to send document:', docResult);
          } else {
            console.log('Receipt PDF sent successfully:', docResult);
          }
        } else {
          formData.append('photo', blob, `receipt_${request.reference_number}.${extension || 'jpg'}`);
          const sendPhotoUrl = `https://api.telegram.org/bot${telegramBotToken}/sendPhoto`;
          console.log('Sending photo to Telegram...');
          const photoResponse = await fetch(sendPhotoUrl, {
            method: 'POST',
            body: formData,
          });
          const photoResult = await photoResponse.text();
          if (!photoResponse.ok) {
            console.error('Failed to send photo:', photoResult);
          } else {
            console.log('Receipt photo sent successfully:', photoResult);
          }
        }
      }
    } else {
      console.log('No receipt_url found in request');
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in send-upgrade-telegram:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
