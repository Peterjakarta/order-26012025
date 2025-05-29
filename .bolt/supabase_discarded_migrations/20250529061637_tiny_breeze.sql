-- Create or update the documents storage bucket

-- Create the documents bucket if it doesn't exist
DO $$
DECLARE 
  bucket_exists BOOLEAN;
BEGIN
  -- Check if the bucket exists
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'documents'
  ) INTO bucket_exists;
  
  -- Create the bucket if it doesn't exist
  IF NOT bucket_exists THEN
    INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
    VALUES ('documents', 'documents', false, false, 10485760, 
      ARRAY['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']::text[]);
  ELSE
    -- Update the bucket to ensure it's not public
    UPDATE storage.buckets
    SET public = false
    WHERE name = 'documents' AND public = true;
  END IF;
END
$$;

-- Create storage bucket policies using the Supabase API
-- Note: We'll handle storage policies programmatically in the application code
-- rather than directly in SQL, as the storage policies table structure may vary