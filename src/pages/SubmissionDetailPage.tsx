import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowLeft,
  FileText,
  Upload,
  Download,
  Calendar,
  Clock,
  User,
  Tag,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  Edit,
  Save,
  X,
} from 'lucide-react';
import { getStatusColor, getStatusLabel } from '../lib/statusLabels';
import { ProcessTrackingWizard } from '../components/ProcessTrackingWizard';
import { CompletionButton } from '../components/CompletionButton';
import { CertificateManager } from '../components/CertificateManager';
import { FullDisclosureManager } from '../components/FullDisclosureManager';
import { MaterialsRequestAction } from '../components/MaterialsRequestAction';
import { MaterialsSubmissionForm } from '../components/MaterialsSubmissionForm';
import { MaterialsView } from '../components/MaterialsView';
import { RevisionBanner } from '../components/RevisionBanner';
import { EditSubmissionModal } from '../components/EditSubmissionModal';
import type { Database } from '../lib/database.types';

type IpRecord = Database['public']['Tables']['ip_records']['Row'] & {
  applicant?: Database['public']['Tables']['users']['Row'];
  supervisor?: Database['public']['Tables']['users']['Row'];
  evaluator?: Database['public']['Tables']['users']['Row'];
};

type Document = Database['public']['Tables']['ip_documents']['Row'];
type Evaluation = Database['public']['Tables']['evaluations']['Row'] & {
  evaluator?: Database['public']['Tables']['users']['Row'];
};

export function SubmissionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [record, setRecord] = useState<IpRecord | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [departments, setDepartments] = useState<{ [key: string]: string }>({});
  const [presentationMaterials, setPresentationMaterials] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [revisionComments, setRevisionComments] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    title: '',
    abstract: '',
    description: '',
  });

  useEffect(() => {
    fetchDepartments();
    if (id) {
      fetchSubmissionDetails();
    }
  }, [id]);

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name');
      
      if (error) throw error;
      if (data) {
        const deptMap = data.reduce((acc, dept) => {
          acc[dept.id] = dept.name;
          return acc;
        }, {} as { [key: string]: string });
        setDepartments(deptMap);
      }
    } catch (error) {
      console.warn('Could not fetch departments:', error);
    }
  };

  const getDepartmentName = (affiliationId: string) => {
    if (!affiliationId) return 'Not specified';
    return departments[affiliationId] || affiliationId;
  };

  const fetchSubmissionDetails = async () => {
    try {
      const { data: recordData, error: recordError } = await supabase
        .from('ip_records')
        .select(`
          *,
          applicant:users!applicant_id(*),
          supervisor:users!supervisor_id(*),
          evaluator:users!evaluator_id(*)
        `)
        .eq('id', id)
        .single();

      if (recordError) throw recordError;
      setRecord(recordData);
      setEditData({
        title: recordData.title,
        abstract: recordData.abstract || '',
        description: (recordData.details as any)?.description || '',
      });

      // Fetch documents - supervisors, evaluators, and admins can view all documents
      // Applicants can only view their own documents
      let docsQuery = supabase
        .from('ip_documents')
        .select('*')
        .eq('ip_record_id', id);
      
      // Apply role-based filtering
      if (profile?.role === 'applicant') {
        docsQuery = docsQuery.eq('uploader_id', profile.id);
      }
      
      const { data: docsData, error: docsError } = await docsQuery.order('created_at', { ascending: false });

      if (docsError) {
        console.warn('Could not fetch documents:', docsError);
        setDocuments([]);
      } else {
        setDocuments(docsData || []);
      }

      const { data: evalsData, error: evalsError } = await supabase
        .from('evaluations')
        .select(`
          *,
          evaluator:users!evaluator_id(*)
        `)
        .eq('ip_record_id', id)
        .order('created_at', { ascending: false });

      if (evalsError) throw evalsError;
      setEvaluations(evalsData || []);

      // Fetch presentation materials
      const { data: materialsData, error: materialsError } = await supabase
        .from('presentation_materials')
        .select('*')
        .eq('ip_record_id', id);

      if (materialsError) {
        console.warn('Could not fetch presentation materials:', materialsError);
        setPresentationMaterials(null);
      } else if (materialsData && materialsData.length > 0) {
        // Take the first/most recent presentation material
        setPresentationMaterials(materialsData[0]);
      } else {
        setPresentationMaterials(null);
      }
    } catch (error) {
      console.error('Error fetching submission details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !profile || !id) return;

    const file = e.target.files[0];
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('ip-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('ip_documents').insert({
        ip_record_id: id,
        uploader_id: profile.id,
        file_name: file.name,
        file_path: filePath,
        mime_type: file.type,
        size_bytes: file.size,
        doc_type: 'attachment',
      });

      if (dbError) throw dbError;

      fetchSubmissionDetails();
    } catch (error: any) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveEdits = async () => {
    if (!record || !profile) return;

    setSaving(true);
    try {
      // Determine next status based on current status - be specific to avoid false matches
      let newStatus: 'waiting_supervisor' | 'waiting_evaluation';
      let newStage: string;

      // Check if record is currently in a supervisor revision state
      if (record.status === 'supervisor_revision') {
        newStatus = 'waiting_supervisor';
        newStage = 'Resubmitted - Waiting for Supervisor';
      } else if (record.status === 'evaluator_revision') {
        newStatus = 'waiting_evaluation';
        newStage = 'Resubmitted - Waiting for Evaluation';
      } else {
        // Fallback: if no supervisor assigned, go to evaluation; otherwise supervisor
        newStatus = record.supervisor_id ? 'waiting_supervisor' : 'waiting_evaluation';
        newStage = record.supervisor_id
          ? 'Resubmitted - Waiting for Supervisor'
          : 'Resubmitted - Waiting for Evaluation';
      }

      // Merge details object to preserve existing fields
      const updatedDetails = {
        ...(record.details || {}),
        description: editData.description,
      };

      const { error: updateError } = await supabase
        .from('ip_records')
        .update({
          title: editData.title,
          abstract: editData.abstract,
          details: updatedDetails,
          status: newStatus,
          current_stage: newStage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', record.id);

      if (updateError) throw updateError;

      const notifyUserId = record.status === 'supervisor_revision'
        ? record.supervisor_id
        : record.status === 'evaluator_revision'
        ? record.evaluator_id
        : record.supervisor_id || record.evaluator_id;

      if (notifyUserId) {
        await supabase.from('notifications').insert({
          user_id: notifyUserId,
          type: 'resubmission',
          title: 'Submission Updated',
          message: `${profile.full_name} has updated their submission "${editData.title}"`,
          payload: { ip_record_id: record.id },
        });
      }

      await supabase.from('activity_logs').insert({
        user_id: profile.id,
        ip_record_id: record.id,
        action: 'submission_updated',
        details: { changes: 'Applicant revised submission', oldStatus: record.status, newStatus },
      });

      // Track the resubmission in process_tracking
      await supabase.from('process_tracking').insert({
        ip_record_id: record.id,
        stage: newStage,
        status: newStatus,
        actor_id: profile.id,
        actor_name: profile.full_name,
        actor_role: 'Applicant',
        action: 'submission_resubmitted',
        description: `Applicant resubmitted with revisions for ${newStatus.replace('_', ' ')}`,
        metadata: { previousStatus: record.status },
      });

      try {
        const { data: applicantData } = await supabase
          .from('users')
          .select('email, full_name')
          .eq('id', record.applicant_id)
          .single();

        if (applicantData) {
          // Send email to applicant confirming resubmission
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-status-notification`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              applicantEmail: applicantData.email,
              applicantName: applicantData.full_name,
              recordTitle: editData.title,
              referenceNumber: record.reference_number || 'N/A',
              oldStatus: record.status,
              newStatus: newStatus,
              currentStage: newStage,
              remarks: 'Your submission has been resubmitted for review.',
              actorName: profile.full_name,
              actorRole: profile.role,
            }),
          });
        }

        // Send email to supervisor/evaluator about the resubmission
        const reviewerData = record.status === 'supervisor_revision' 
          ? record.supervisor 
          : record.evaluator;

        if (reviewerData && reviewerData.email) {
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-revision-resubmit-notification`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              supervisorEmail: reviewerData.email,
              supervisorName: reviewerData.full_name,
              applicantName: profile.full_name,
              recordTitle: editData.title,
              referenceNumber: record.reference_number || 'N/A',
              previousStatus: record.status,
              newStatus: newStatus,
              resubmitDate: new Date().toISOString(),
            }),
          });
        }
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }

      setEditMode(false);
      fetchSubmissionDetails();
      alert('Submission updated successfully!');
    } catch (error: any) {
      console.error('Error saving edits:', error);
      alert('Failed to save changes: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const canEdit = () => {
    if (!profile || !record) return false;
    if (profile.role !== 'applicant' || profile.id !== record.applicant_id) return false;
    return record.status === 'supervisor_revision' || record.status === 'evaluator_revision';
  };

  const handleSaveDraft = async (editData: any) => {
    if (!record || !profile || !id) return;

    try {
      // Update submission with new data
      const updatedDetails = {
        ...(record.details || {}),
        description: editData.description,
        technicalField: editData.technicalField,
        backgroundArt: editData.backgroundArt,
        problemStatement: editData.problemStatement,
        solution: editData.solution,
        advantages: editData.advantages,
        implementation: editData.implementation,
        inventors: editData.inventors,
        dateConceived: editData.dateConceived,
        dateReduced: editData.dateReduced,
        priorArt: editData.priorArt,
        keywords: editData.keywords.map((k: any) => k.value).filter((k: string) => k.trim()),
        funding: editData.funding,
        collaborators: editData.collaborators.filter((c: any) => c.name.trim()),
        commercialPotential: editData.commercialPotential,
        targetMarket: editData.targetMarket,
        competitiveAdvantage: editData.competitiveAdvantage,
        estimatedValue: editData.estimatedValue,
        relatedPublications: editData.relatedPublications,
      };

      // Update submission record (keep current status for draft save)
      const { error: updateError } = await supabase
        .from('ip_records')
        .update({
          title: editData.title,
          abstract: editData.abstract,
          category: editData.category,
          details: updatedDetails,
          supervisor_id: editData.supervisorId || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Handle document deletions using edge function
      if (editData.documentsToDelete && editData.documentsToDelete.length > 0) {
        console.log(`[SaveDraftDeletion] Starting deletion of ${editData.documentsToDelete.length} documents`);
        
        try {
          const documentIds = editData.documentsToDelete.map((doc: any) => doc.id);
          
          console.log(`[SaveDraftDeletion] Calling delete-ip-documents edge function for IDs:`, documentIds);
          
          const deleteResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-ip-documents`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                documentIds: documentIds,
                recordId: id,
              }),
            }
          );

          const deleteResult = await deleteResponse.json();
          
          if (!deleteResponse.ok) {
            console.error(`[SaveDraftDeletion] Edge function error:`, deleteResult);
            throw new Error(deleteResult.error || "Failed to delete documents");
          }
          
          console.log(`[SaveDraftDeletion] Successfully deleted ${deleteResult.deleted} documents`);
        } catch (deleteError) {
          console.error(`[SaveDraftDeletion] Critical error:`, deleteError);
          throw deleteError;
        }
      }

      // Handle new document uploads
      for (const newDoc of editData.newDocuments) {
        const fileName = `${Date.now()}_${newDoc.file.name}`;
        const filePath = `${id}/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('ip-documents')
          .upload(filePath, newDoc.file);

        if (uploadError) throw uploadError;

        // Add to database
        await supabase.from('ip_documents').insert({
          ip_record_id: id,
          uploader_id: profile.id,
          file_name: newDoc.file.name,
          file_path: filePath,
          mime_type: newDoc.file.type,
          size_bytes: newDoc.file.size,
          doc_type: 'attachment',
        });
      }

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: profile.id,
        ip_record_id: id,
        action: 'submission_draft_saved',
        details: { changes: 'Applicant saved draft revisions' },
      });

      setShowEditModal(false);
      fetchSubmissionDetails();
      alert('Draft saved successfully!');
    } catch (error: any) {
      console.error('Error saving draft:', error);
      alert('Failed to save draft: ' + error.message);
      throw error;
    }
  };

  const handleResubmit = async (editData: any) => {
    if (!record || !profile || !id) return;

    console.log('🔵 handleResubmit START');
    alert(`🔵 RESUBMIT START - ${editData.documentsToDelete?.length || 0} docs to delete`);

    try {
      console.log('[handleResubmit] Called with editData:', editData);
      console.log('[handleResubmit] documentsToDelete:', editData.documentsToDelete);
      console.log('[handleResubmit] newDocuments:', editData.newDocuments);
      console.log('[handleResubmit] documentsToDelete length:', editData.documentsToDelete?.length);

      // Determine next status based on current status
      let newStatus: 'waiting_supervisor' | 'waiting_evaluation';
      let newStage: string;

      if (record.status === 'supervisor_revision') {
        newStatus = 'waiting_supervisor';
        newStage = 'Resubmitted - Waiting for Supervisor';
      } else if (record.status === 'evaluator_revision') {
        newStatus = 'waiting_evaluation';
        newStage = 'Resubmitted - Waiting for Evaluation';
      } else {
        newStatus = record.supervisor_id ? 'waiting_supervisor' : 'waiting_evaluation';
        newStage = record.supervisor_id
          ? 'Resubmitted - Waiting for Supervisor'
          : 'Resubmitted - Waiting for Evaluation';
      }

      // Update submission with new data and new status
      const updatedDetails = {
        ...(record.details || {}),
        description: editData.description,
        technicalField: editData.technicalField,
        backgroundArt: editData.backgroundArt,
        problemStatement: editData.problemStatement,
        solution: editData.solution,
        advantages: editData.advantages,
        implementation: editData.implementation,
        inventors: editData.inventors,
        dateConceived: editData.dateConceived,
        dateReduced: editData.dateReduced,
        priorArt: editData.priorArt,
        keywords: editData.keywords.map((k: any) => k.value).filter((k: string) => k.trim()),
        funding: editData.funding,
        collaborators: editData.collaborators.filter((c: any) => c.name.trim()),
        commercialPotential: editData.commercialPotential,
        targetMarket: editData.targetMarket,
        competitiveAdvantage: editData.competitiveAdvantage,
        estimatedValue: editData.estimatedValue,
        relatedPublications: editData.relatedPublications,
      };

      // Update submission record
      const { error: updateError } = await supabase
        .from('ip_records')
        .update({
          title: editData.title,
          abstract: editData.abstract,
          category: editData.category,
          details: updatedDetails,
          supervisor_id: editData.supervisorId || null,
          status: newStatus,
          current_stage: newStage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Handle document deletions using edge function
      if (editData.documentsToDelete && editData.documentsToDelete.length > 0) {
        console.log(`[ResubmitDeletion] Starting deletion of ${editData.documentsToDelete.length} documents`);
        
        try {
          const documentIds = editData.documentsToDelete.map((doc: any) => doc.id);
          
          console.log(`[ResubmitDeletion] Calling delete-ip-documents edge function for IDs:`, documentIds);
          
          const deleteResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-ip-documents`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                documentIds: documentIds,
                recordId: id,
              }),
            }
          );

          const deleteResult = await deleteResponse.json();
          
          if (!deleteResponse.ok) {
            console.error(`[ResubmitDeletion] Edge function error:`, deleteResult);
            throw new Error(deleteResult.error || "Failed to delete documents");
          }
          
          console.log(`[ResubmitDeletion] Successfully deleted ${deleteResult.deleted} documents`);
        } catch (deleteError) {
          console.error(`[ResubmitDeletion] Critical error:`, deleteError);
          throw deleteError;
        }
      }

      // Handle new document uploads
      for (const newDoc of editData.newDocuments) {
        const fileName = `${Date.now()}_${newDoc.file.name}`;
        const filePath = `${id}/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('ip-documents')
          .upload(filePath, newDoc.file);

        if (uploadError) throw uploadError;

        // Add to database
        await supabase.from('ip_documents').insert({
          ip_record_id: id,
          uploader_id: profile.id,
          file_name: newDoc.file.name,
          file_path: filePath,
          mime_type: newDoc.file.type,
          size_bytes: newDoc.file.size,
          doc_type: 'attachment',
        });
      }

      // Notify supervisor/evaluator
      const notifyUserId =
        record.status === 'supervisor_revision'
          ? record.supervisor_id
          : record.status === 'evaluator_revision'
          ? record.evaluator_id
          : record.supervisor_id || record.evaluator_id;

      if (notifyUserId) {
        await supabase.from('notifications').insert({
          user_id: notifyUserId,
          type: 'resubmission',
          title: 'Submission Updated',
          message: `${profile.full_name} has updated their submission "${editData.title}"`,
          payload: { ip_record_id: id },
        });
      }

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: profile.id,
        ip_record_id: id,
        action: 'submission_resubmitted',
        details: { changes: 'Applicant resubmitted with revisions', oldStatus: record.status, newStatus },
      });

      // Track in process tracking
      await supabase.from('process_tracking').insert({
        ip_record_id: id,
        stage: newStage,
        status: newStatus,
        actor_id: profile.id,
        actor_name: profile.full_name,
        actor_role: 'Applicant',
        action: 'submission_resubmitted',
        description: `Applicant resubmitted with revisions for ${newStatus.replace('_', ' ')}`,
        metadata: { previousStatus: record.status },
      });

      // Send email notifications
      try {
        // 1. Notify applicant of resubmission
        const { data: applicantData } = await supabase
          .from('users')
          .select('email, full_name')
          .eq('id', record.applicant_id)
          .single();

        if (applicantData) {
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-status-notification`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              applicantEmail: applicantData.email,
              applicantName: applicantData.full_name,
              recordTitle: editData.title,
              referenceNumber: record.reference_number || 'N/A',
              oldStatus: record.status,
              newStatus: newStatus,
              currentStage: newStage,
              remarks: 'Your submission has been resubmitted for review.',
              actorName: profile.full_name,
              actorRole: profile.role,
            }),
          });
        }

        // 2. Notify supervisor/evaluator of revised submission
        const supervisorId = record.status === 'supervisor_revision' ? record.supervisor_id : record.status === 'evaluator_revision' ? record.evaluator_id : record.supervisor_id || record.evaluator_id;
        const isSupervisorRevision = record.status === 'supervisor_revision';

        if (supervisorId) {
          const { data: reviewerData } = await supabase
            .from('users')
            .select('email, full_name')
            .eq('id', supervisorId)
            .single();

          if (reviewerData) {
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-revision-resubmit-notification`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                supervisorEmail: reviewerData.email,
                supervisorName: reviewerData.full_name,
                applicantName: applicantData?.full_name || 'Applicant',
                recordTitle: editData.title,
                referenceNumber: record.reference_number || 'N/A',
                previousStatus: record.status,
                newStatus: newStatus,
                resubmitDate: new Date().toISOString(),
              }),
            });
          }
        }
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }

      setShowEditModal(false);
      fetchSubmissionDetails();
      alert('Submission resubmitted successfully!');
    } catch (error: any) {
      console.error('Error resubmitting:', error);
      alert('Failed to resubmit: ' + error.message);
      throw error;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getStatusIcon = (status: string) => {
    if (status.includes('approved') || status === 'ready_for_filing') {
      return <CheckCircle className="h-5 w-5" />;
    }
    if (status.includes('revision') || status === 'rejected') {
      return <AlertCircle className="h-5 w-5" />;
    }
    return <Clock className="h-5 w-5" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Submission Not Found</h2>
        <p className="text-gray-600 mb-4">The submission you're looking for doesn't exist or you don't have access.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Revision Banner */}
      {record && (record.status === 'supervisor_revision' || record.status === 'evaluator_revision') && (
        <RevisionBanner
          status={record.status}
          revisionReason={revisionComments}
          requestedBy={record.status === 'supervisor_revision' ? record.supervisor : record.evaluator}
          requestedByRole={record.status === 'supervisor_revision' ? 'supervisor' : 'evaluator'}
          requestedAt={record.updated_at}
        />
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </button>
        {canEdit() && !editMode && (
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Edit className="h-4 w-4" />
            Edit Submission
          </button>
        )}
        {editMode && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditMode(false);
                setEditData({
                  title: record.title,
                  abstract: record.abstract || '',
                  description: (record.details as any)?.description || '',
                });
              }}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              onClick={handleSaveEdits}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            {editMode ? (
              <input
                type="text"
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                className="w-full text-3xl font-bold text-gray-900 mb-2 px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Enter title"
              />
            ) : (
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{record.title}</h1>
            )}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {record.applicant?.full_name}
              </span>
              <span className="flex items-center gap-1">
                <Tag className="h-4 w-4" />
                <span className="capitalize">{record.category}</span>
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(record.created_at)}
              </span>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 ${getStatusColor(record.status)}`}>
            {getStatusIcon(record.status)}
            <span>{getStatusLabel(record.status)}</span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Supervisor</div>
            <div className="font-semibold text-gray-900">
              {record.supervisor?.full_name || 'Not assigned'}
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Evaluator</div>
            <div className="font-semibold text-gray-900">
              {record.evaluator?.full_name || 'Not assigned'}
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Category</div>
            <div className="font-semibold text-gray-900 capitalize">{record.category}</div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Abstract</h3>
            {editMode ? (
              <textarea
                value={editData.abstract}
                onChange={(e) => setEditData({ ...editData, abstract: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Enter abstract"
              />
            ) : (
              <p className="text-gray-700 leading-relaxed">{record.abstract || 'No abstract provided'}</p>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
            {editMode ? (
              <textarea
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                rows={8}
                className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Enter detailed description"
              />
            ) : (
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {(record.details && typeof record.details === 'object' && 'description' in record.details)
                  ? String(record.details.description)
                  : 'No description provided'}
              </p>
            )}
          </div>

          {record.details && Object.keys(record.details).length > 0 && (
            <div>
              {(() => {
                // Fields that are already displayed above
                const displayedFields = ['title', 'abstract', 'description', 'category'];
                
                // Get other details that aren't already shown
                const otherDetails = record.details && typeof record.details === 'object' 
                  ? Object.entries(record.details).filter(([key]) => !displayedFields.includes(key))
                  : [];

                const hasOtherDetails = otherDetails.length > 0;

                return hasOtherDetails ? (
                  <>
                    <button
                      onClick={() => setShowMoreDetails(true)}
                      className="flex items-center gap-2 px-6 py-2 mt-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                    >
                      <FileText className="h-4 w-4" />
                      View Additional Details
                    </button>

                    {showMoreDetails && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                        <div className="bg-white rounded-xl max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto">
                          {/* Modal Header */}
                          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex justify-between items-center">
                            <div>
                              <h3 className="text-2xl font-bold">Additional Details</h3>
                              <p className="text-blue-100 text-sm mt-1">{record.title}</p>
                            </div>
                            <button
                              onClick={() => setShowMoreDetails(false)}
                              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
                              title="Close details"
                              aria-label="Close details modal"
                            >
                              <X className="h-6 w-6" />
                            </button>
                          </div>

                          {/* Modal Content */}
                          <div className="p-6 space-y-6">
                            {otherDetails.map(([key, value]) => {
                              const fieldName = key.replace(/([A-Z])/g, ' $1').trim();
                              
                              // Render based on value type
                              let renderValue = null;
                              
                              if (Array.isArray(value)) {
                                // Handle arrays
                                if (value.length === 0) {
                                  renderValue = <span className="text-gray-500 italic">Empty</span>;
                                } else if (typeof value[0] === 'object' && value[0] !== null) {
                                  // Array of objects (like inventors, collaborators)
                                  renderValue = (
                                    <div className="space-y-3">
                                      {value.map((item, idx) => (
                                        <div key={idx} className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                                          {Object.entries(item)
                                            .filter(([k]) => k !== 'id') // Filter out id field
                                            .map(([k, v]) => {
                                              // Special handling for affiliation field - show department name instead of UUID
                                              let displayValue = String(v);
                                              if (k === 'affiliation' && v) {
                                                displayValue = getDepartmentName(String(v));
                                              }
                                              
                                              return (
                                                <div key={k} className="text-sm py-1">
                                                  <span className="font-semibold text-blue-900">{k.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                                  <span className="text-gray-700 ml-2">{displayValue}</span>
                                                </div>
                                              );
                                            })}
                                        </div>
                                      ))}
                                    </div>
                                  );
                                } else {
                                  // Array of primitives (like keywords)
                                  renderValue = (
                                    <div className="flex flex-wrap gap-2">
                                      {value.map((item, idx) => (
                                        <span key={idx} className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors">
                                          {String(item)}
                                        </span>
                                      ))}
                                    </div>
                                  );
                                }
                              } else if (typeof value === 'object' && value !== null) {
                                // Handle plain objects
                                renderValue = (
                                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-300 space-y-2">
                                    {Object.entries(value)
                                      .filter(([k]) => k !== 'id') // Filter out id field
                                      .map(([k, v]) => (
                                      <div key={k} className="text-sm py-1">
                                        <span className="font-semibold text-gray-900">{k.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                        <span className="text-gray-700 ml-2">{String(v)}</span>
                                      </div>
                                    ))}
                                  </div>
                                );
                              } else {
                                // Handle primitives
                                renderValue = <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{String(value)}</p>;
                              }

                              return (
                                <div key={key} className="border-b border-gray-200 pb-4 last:border-b-0">
                                  <h4 className="text-lg font-bold text-gray-900 mb-3 capitalize flex items-center gap-2">
                                    <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                                    {fieldName}
                                  </h4>
                                  {renderValue}
                                </div>
                              );
                            })}
                          </div>

                          {/* Modal Footer */}
                          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
                            <button
                              onClick={() => setShowMoreDetails(false)}
                              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors"
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : null;
              })()}
            </div>
          )}
        </div>
      </div>

      <ProcessTrackingWizard
        ipRecordId={record.id}
        currentStatus={record.status}
        currentStage={record.current_stage}
      />

      {/* Academic Presentation Materials Section */}
      {record.current_stage === 'academic_presentation_materials' && profile?.role === 'admin' && (
        <MaterialsRequestAction
          ipRecordId={record.id}
          applicantEmail={record.applicant?.email || ''}
          applicantName={record.applicant?.full_name || ''}
          ipTitle={record.title}
          onSuccess={() => fetchSubmissionDetails()}
          onError={(error) => console.error('Materials request error:', error)}
        />
      )}

      {/* Show materials submission form to applicant when materials are requested */}
      {profile?.role === 'applicant' && record.applicant_id === profile.id && (
        <MaterialsSubmissionForm
          ipRecordId={record.id}
          applicantId={profile.id}
          onSuccess={() => fetchSubmissionDetails()}
          onError={(error) => console.error('Materials submission error:', error)}
        />
      )}

      {/* Display submitted materials to both applicant and admin */}
      {presentationMaterials && presentationMaterials.status === 'submitted' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Submitted Materials</h2>
          <p className="text-sm text-gray-600 mb-4">
            Submitted on {presentationMaterials.materials_submitted_at ? new Date(presentationMaterials.materials_submitted_at).toLocaleString() : 'Unknown date'}
          </p>
          <MaterialsView
            submissionId={record.id}
            posterFileName={presentationMaterials.poster_file_name}
            posterFileUrl={presentationMaterials.poster_file_url}
            posterFileSize={presentationMaterials.poster_file_size}
            paperFileName={presentationMaterials.paper_file_name}
            paperFileUrl={presentationMaterials.paper_file_url}
            paperFileSize={presentationMaterials.paper_file_size}
            userRole={profile?.role === 'admin' ? 'admin' : 'applicant'}
          />
        </div>
      )}

      {profile?.role === 'admin' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Admin Actions</h2>
          <div className="space-y-4">
            <MaterialsRequestAction
              ipRecordId={record.id}
              applicantEmail={record.applicant?.email || ''}
              applicantName={record.applicant?.full_name || ''}
              ipTitle={record.title}
              onSuccess={() => fetchSubmissionDetails()}
              onError={(error) => console.error('Materials request error:', error)}
            />
            <CompletionButton
              recordId={record.id}
              currentStatus={record.status}
              currentStage={record.current_stage}
              applicantEmail={record.applicant?.email || ''}
              applicantName={record.applicant?.full_name || ''}
              title={record.title}
              referenceNumber={record.reference_number || ''}
              category={record.category}
              onComplete={() => fetchSubmissionDetails()}
            />
          </div>
        </div>
      )}

      <CertificateManager
        recordId={record.id}
        recordTitle={record.title}
        recordCategory={record.category}
        recordStatus={record.status}
        referenceNumber={record.reference_number || ''}
        applicantName={record.applicant?.full_name || ''}
        applicantEmail={record.applicant?.email || ''}
        coCreators={(record.details as any)?.coCreators}
        evaluationScore={(record.details as any)?.evaluationScore}
      />

      <FullDisclosureManager
        recordId={record.id}
        recordTitle={record.title}
        recordCategory={record.category}
        recordStatus={record.status}
        referenceNumber={record.reference_number || ''}
        applicantName={record.applicant?.full_name || ''}
        applicantEmail={record.applicant?.email || ''}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Documents</h2>
          {profile?.role === 'applicant' && record.applicant_id === profile.id && (
            <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
              <Upload className="h-4 w-4" />
              {uploading ? 'Uploading...' : 'Upload Document'}
              <input
                type="file"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          )}
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No documents uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900">{doc.file_name}</div>
                    <div className="text-sm text-gray-500">
                      {doc.size_bytes && formatFileSize(doc.size_bytes)} • {formatDate(doc.created_at)}
                    </div>
                  </div>
                </div>
                <button 
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  title="Download document"
                  aria-label={`Download ${doc.file_name}`}
                >
                  <Download className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {evaluations.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Evaluations</h2>
          <div className="space-y-6">
            {evaluations.map((evaluation) => (
              <div key={evaluation.id} className="border-l-4 border-blue-500 pl-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {evaluation.evaluator?.full_name}
                    </div>
                    <div className="text-sm text-gray-500">{formatDate(evaluation.created_at)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{evaluation.grade}</div>
                    {evaluation.score && typeof evaluation.score === 'object' && 'overall' in evaluation.score && (
                      <div className="text-sm text-gray-500">
                        {Number(evaluation.score.overall).toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>

                {evaluation.score && typeof evaluation.score === 'object' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-4">
                    {'innovation' in evaluation.score && (
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-sm text-gray-600">Innovation</div>
                        <div className="text-lg font-bold text-gray-900">
                          {evaluation.score.innovation}/10
                        </div>
                      </div>
                    )}
                    {'feasibility' in evaluation.score && (
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-sm text-gray-600">Feasibility</div>
                        <div className="text-lg font-bold text-gray-900">
                          {evaluation.score.feasibility}/10
                        </div>
                      </div>
                    )}
                    {'marketPotential' in evaluation.score && (
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-sm text-gray-600">Market</div>
                        <div className="text-lg font-bold text-gray-900">
                          {evaluation.score.marketPotential}/10
                        </div>
                      </div>
                    )}
                    {'technicalMerit' in evaluation.score && (
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-sm text-gray-600">Technical</div>
                        <div className="text-lg font-bold text-gray-900">
                          {evaluation.score.technicalMerit}/10
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-3">
                  <div className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Remarks
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{evaluation.remarks}</p>
                </div>

                <div className="mt-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      evaluation.decision === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : evaluation.decision === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}
                  >
                    {evaluation.decision.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Submission Modal */}
      <EditSubmissionModal
        isOpen={showEditModal}
        record={record}
        documents={documents}
        onClose={() => setShowEditModal(false)}
        onSaveDraft={handleSaveDraft}
        onResubmit={handleResubmit}
        profile={profile}
      />
    </div>
  );
}
