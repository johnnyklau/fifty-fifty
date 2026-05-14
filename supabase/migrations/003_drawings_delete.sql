create policy "Users can delete own drawings"
  on public.drawings for delete using (auth.uid() = user_id);
