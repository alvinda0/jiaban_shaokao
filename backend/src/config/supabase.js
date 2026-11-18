const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// Check if credentials are configured
if (!supabaseUrl || !supabaseKey || supabaseUrl === 'your_supabase_project_url') {
  console.warn('⚠️  Supabase credentials not configured. Image upload will be disabled.');
  module.exports = null;
} else {
  const supabase = createClient(supabaseUrl, supabaseKey);
  module.exports = supabase;
}

