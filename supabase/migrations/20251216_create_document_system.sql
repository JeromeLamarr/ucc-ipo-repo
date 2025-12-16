-- Create table for document templates and generated documents

CREATE TABLE IF NOT EXISTS public.document_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'disclosure', 'assignment', 'declaration', etc.
  category TEXT NOT NULL, -- 'patent', 'trademark', 'copyright', etc.
  content TEXT NOT NULL, -- Template HTML or markdown
  required BOOLEAN DEFAULT true,
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.submission_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_record_id UUID REFERENCES public.ip_records(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.document_templates(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL, -- 'disclosure_form', 'full_documentation', 'pdf_export', etc.
  status TEXT DEFAULT 'draft', -- 'draft', 'completed', 'signed', 'submitted'
  content JSONB, -- Filled form data
  generated_file_path TEXT, -- Path to generated PDF in storage
  generated_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submission_documents_record ON public.submission_documents(ip_record_id);
CREATE INDEX IF NOT EXISTS idx_submission_documents_type ON public.submission_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_submission_documents_status ON public.submission_documents(status);

-- Enable RLS
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "document_templates_select_active" ON public.document_templates
  FOR SELECT USING (active = true OR EXISTS(
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'supervisor', 'evaluator')
  ));

CREATE POLICY "submission_documents_select" ON public.submission_documents
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM public.ip_records WHERE id = ip_record_id AND applicant_id = auth.uid()) OR
    EXISTS(SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'supervisor', 'evaluator'))
  );

CREATE POLICY "submission_documents_insert" ON public.submission_documents
  FOR INSERT WITH CHECK (
    EXISTS(SELECT 1 FROM public.ip_records WHERE id = ip_record_id AND applicant_id = auth.uid()) OR
    EXISTS(SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "submission_documents_update" ON public.submission_documents
  FOR UPDATE USING (
    EXISTS(SELECT 1 FROM public.ip_records WHERE id = ip_record_id AND applicant_id = auth.uid()) OR
    EXISTS(SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
