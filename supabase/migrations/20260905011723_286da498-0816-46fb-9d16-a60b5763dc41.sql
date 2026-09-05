CREATE POLICY "own pdfs read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "own pdfs insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "own pdfs update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'pdfs' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "own pdfs delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);