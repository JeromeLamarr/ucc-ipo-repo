import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  validateFile,
  validateRequiredDocuments,
  ALLOWED_DOCUMENT_TYPES,
  MAX_FILE_SIZE,
  ErrorResponse,
} from '../lib/validation';
import { DocumentUploadSection } from '../components/DocumentUploadSection';
import {
  FileText,
  Upload,
  User,
  AlertCircle,
  CheckCircle,
  X,
  FileIcon,
  Users,
  Calendar,
  Building,
  Globe,
  DollarSign,
  Target
} from 'lucide-react';
import type { Database } from '../lib/database.types';

type User = Database['public']['Tables']['users']['Row'];

const categories = [
  { value: 'patent', label: 'Patent' },
  { value: 'copyright', label: 'Copyright' },
  { value: 'trademark', label: 'Trademark' },
  { value: 'design', label: 'Industrial Design' },
  { value: 'utility_model', label: 'Utility Model' },
  { value: 'other', label: 'Other' },
];

interface UploadedFile {
  file: File;
  type: string;
  preview?: string;
}

interface Inventor {
  name: string;
  affiliation: string;
  contribution: string;
}

interface Keyword {
  id: string;
  value: string;
}

interface Department {
  id: string;
  name: string;
}

interface Collaborator {
  id: string;
  name: string;
  role: string;
  affiliation: string;
}

export function NewSubmissionPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [supervisors, setSupervisors] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState({
    title: '',
    category: 'patent',
    abstract: '',
    description: '',
    technicalField: '',
    backgroundArt: '',
    problemStatement: '',
    solution: '',
    advantages: '',
    implementation: '',
    inventors: [{ name: profile?.full_name || '', affiliation: profile?.department_id || '', contribution: '' }],
    dateConceived: '',
    dateReduced: '',
    priorArt: '',
    keywords: [{ id: '1', value: '' }],
    funding: '',
    collaborators: [{ id: '1', name: '', role: '', affiliation: '' }],
    commercialPotential: '',
    targetMarket: '',
    competitiveAdvantage: '',
    estimatedValue: '',
    relatedPublications: '',
    supervisorId: '',
  });

  useEffect(() => {
    fetchSupervisors();
    fetchDepartments();
  }, []);

  const fetchSupervisors = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'supervisor')
        .order('full_name');

      if (error) throw error;
      setSupervisors(data || []);
    } catch (error) {
      console.error('Error fetching supervisors:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-departments?action=list-active`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const { data } = await response.json();
        setDepartments(data || []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const addInventor = () => {
    setFormData({
      ...formData,
      inventors: [...formData.inventors, { name: '', affiliation: '', contribution: '' }],
    });
  };

  const removeInventor = (index: number) => {
    const newInventors = formData.inventors.filter((_, i) => i !== index);
    setFormData({ ...formData, inventors: newInventors });
  };

  const updateInventor = (index: number, field: string, value: string) => {
    const newInventors = [...formData.inventors];
    newInventors[index] = { ...newInventors[index], [field]: value };
    setFormData({ ...formData, inventors: newInventors });
  };

  const addKeyword = () => {
    setFormData({
      ...formData,
      keywords: [...formData.keywords, { id: Date.now().toString(), value: '' }],
    });
  };

  const removeKeyword = (id: string) => {
    if (formData.keywords.length > 1) {
      setFormData({
        ...formData,
        keywords: formData.keywords.filter(k => k.id !== id),
      });
    }
  };

  const updateKeyword = (id: string, value: string) => {
    setFormData({
      ...formData,
      keywords: formData.keywords.map(k => k.id === id ? { ...k, value } : k),
    });
  };

  const addCollaborator = () => {
    setFormData({
      ...formData,
      collaborators: [...formData.collaborators, { id: Date.now().toString(), name: '', role: '', affiliation: '' }],
    });
  };

  const removeCollaborator = (id: string) => {
    if (formData.collaborators.length > 1) {
      setFormData({
        ...formData,
        collaborators: formData.collaborators.filter(c => c.id !== id),
      });
    }
  };

  const updateCollaborator = (id: string, field: string, value: string) => {
    setFormData({
      ...formData,
      collaborators: formData.collaborators.map(c =>
        c.id === id ? { ...c, [field]: value } : c
      ),
    });
  };

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setError('');
    setLoading(true);
    setUploading(true);

    try {
      // No document validation required - users can submit without files
      // Documents are optional; disclosure form will be auto-generated

      const ipDetails = {
        description: formData.description,
        technicalField: formData.technicalField,
        backgroundArt: formData.backgroundArt,
        problemStatement: formData.problemStatement,
        solution: formData.solution,
        advantages: formData.advantages,
        implementation: formData.implementation,
        inventors: formData.inventors,
        dateConceived: formData.dateConceived,
        dateReduced: formData.dateReduced,
        priorArt: formData.priorArt,
        keywords: formData.keywords.map(k => k.value).filter(k => k.trim()),
        funding: formData.funding,
        collaborators: formData.collaborators.filter(c => c.name.trim()),
        commercialPotential: formData.commercialPotential,
        targetMarket: formData.targetMarket,
        competitiveAdvantage: formData.competitiveAdvantage,
        estimatedValue: formData.estimatedValue,
        relatedPublications: formData.relatedPublications,
      };

      const initialStatus = formData.supervisorId ? 'waiting_supervisor' : 'submitted';
      const initialStage = formData.supervisorId ? 'Waiting for Supervisor Approval' : 'Submitted';

      const { data: ipRecord, error: ipError } = await supabase
        .from('ip_records')
        .insert({
          applicant_id: profile.id,
          title: formData.title,
          category: formData.category as any,
          abstract: formData.abstract,
          details: ipDetails,
          status: initialStatus,
          supervisor_id: formData.supervisorId || null,
          current_stage: initialStage,
        })
        .select()
        .single();

      if (ipError) throw ipError;

      // Upload all files with proper error handling and progress tracking
      const uploadedDocuments: Array<{ type: string; name: string }> = [];
      setUploading(true);
      setUploadProgress(0);

      for (let i = 0; i < uploadedFiles.length; i++) {
        const uploadedFile = uploadedFiles[i];
        try {
          const fileExt = uploadedFile.file.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}_${uploadedFile.file.name}`;
          const filePath = `${ipRecord.id}/${fileName}`;

          // Update progress (50% for storage upload)
          const storageProgress = Math.round(((i + 0.5) / uploadedFiles.length) * 100);
          setUploadProgress(storageProgress);

          // Upload to storage
          const { error: uploadError } = await supabase.storage
            .from('ip-documents')
            .upload(filePath, uploadedFile.file, {
              contentType: uploadedFile.file.type,
              upsert: false
            });

          if (uploadError) {
            console.error(`[NewSubmission] Storage upload failed for ${uploadedFile.file.name}:`, uploadError);
            throw new Error(`Failed to upload ${uploadedFile.file.name}: ${uploadError.message}`);
          }

          // Update progress (100% for this file including DB)
          const dbProgress = Math.round(((i + 1) / uploadedFiles.length) * 100);
          setUploadProgress(dbProgress);

          // Record in database
          const { error: dbError } = await supabase.from('ip_documents').insert({
            ip_record_id: ipRecord.id,
            uploader_id: profile.id,
            file_name: uploadedFile.file.name,
            file_path: filePath,
            mime_type: uploadedFile.file.type,
            size_bytes: uploadedFile.file.size,
            doc_type: uploadedFile.type as any,
          });

          if (dbError) {
            console.error(`[NewSubmission] Database insert failed for ${uploadedFile.file.name}:`, dbError);
            // Try to clean up the uploaded file
            await supabase.storage
              .from('ip-documents')
              .remove([filePath])
              .catch(e => console.warn('File cleanup failed:', e));
            throw new Error(`Failed to record ${uploadedFile.file.name}: ${dbError.message}`);
          }

          uploadedDocuments.push({ type: uploadedFile.type, name: uploadedFile.file.name });
          console.log(`[NewSubmission] Successfully uploaded: ${uploadedFile.file.name} (${uploadedFile.type})`);
        } catch (fileError: any) {
          console.error(`[NewSubmission] Error processing file ${uploadedFile.file.name}:`, fileError);
          setUploading(false);
          setUploadProgress(0);
          throw fileError;
        }
      }

      if (uploadedDocuments.length === 0) {
        setUploading(false);
        setUploadProgress(0);
        throw new Error('No documents were uploaded successfully');
      }

      console.log(`[NewSubmission] All ${uploadedDocuments.length} documents uploaded successfully`);
      setUploading(false);
      setUploadProgress(0);

      const { data: categoryEvaluator } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('role', 'evaluator')
        .eq('category_specialization', formData.category)
        .maybeSingle();

      if (formData.supervisorId) {
        await supabase.from('supervisor_assignments').insert({
          ip_record_id: ipRecord.id,
          supervisor_id: formData.supervisorId,
          assigned_by: profile.id,
          status: 'pending',
        });

        await supabase.from('notifications').insert({
          user_id: formData.supervisorId,
          type: 'assignment',
          title: 'New IP Submission Assigned',
          message: `${profile.full_name} has assigned you to review "${formData.title}"`,
          payload: { ip_record_id: ipRecord.id },
        });

        const { data: supervisorData } = await supabase
          .from('users')
          .select('email, full_name')
          .eq('id', formData.supervisorId)
          .single();

        if (supervisorData?.email) {
          try {
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification-email`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: supervisorData.email,
                subject: 'New IP Submission Assigned for Review',
                title: 'New IP Submission Assigned',
                message: `${profile.full_name} has assigned you to review their intellectual property submission titled "${formData.title}".`,
                submissionTitle: formData.title,
                submissionCategory: formData.category,
                applicantName: profile.full_name,
              }),
            });
          } catch (emailError) {
            console.error('Error sending supervisor email:', emailError);
          }
        }
      } else if (categoryEvaluator) {
        // Auto-assign evaluator by category
        const { data: assignmentData, error: assignmentError } = await supabase
          .from('evaluator_assignments')
          .insert({
            ip_record_id: ipRecord.id,
            evaluator_id: categoryEvaluator.id,
            category: formData.category as any,
            assigned_by: profile.id,
          })
          .select()
          .single();

        if (assignmentError) {
          console.error('Failed to create evaluator assignment:', assignmentError);
        } else {
          console.log('Evaluator assignment created:', { 
            submission_id: ipRecord.id, 
            evaluator_id: categoryEvaluator.id,
            assignment: assignmentData 
          });
        }

        await supabase.from('ip_records').update({
          evaluator_id: categoryEvaluator.id,
          status: 'waiting_evaluation',
          current_stage: 'Waiting for Evaluation',
        }).eq('id', ipRecord.id);

        await supabase.from('notifications').insert({
          user_id: categoryEvaluator.id,
          type: 'assignment',
          title: 'New IP Submission for Evaluation',
          message: `A ${formData.category} submission "${formData.title}" has been assigned to you automatically based on your specialization`,
          payload: { ip_record_id: ipRecord.id },
        });

        await supabase.from('activity_logs').insert({
          user_id: profile.id,
          ip_record_id: ipRecord.id,
          action: 'evaluator_auto_assigned',
          details: {
            evaluator_id: categoryEvaluator.id,
            category: formData.category,
            method: 'automatic',
          },
        });

        await supabase.from('process_tracking').insert({
          ip_record_id: ipRecord.id,
          stage: 'Waiting for Evaluation',
          status: 'waiting_evaluation',
          actor_id: categoryEvaluator.id,
          actor_name: categoryEvaluator.full_name || 'System',
          actor_role: 'Evaluator',
          action: 'evaluator_assigned',
          description: `Evaluator assigned automatically based on ${formData.category} specialization`,
          metadata: { category: formData.category, method: 'automatic' },
        });
      }

      await supabase.from('notifications').insert({
        user_id: profile.id,
        type: 'submission_received',
        title: 'Submission Received',
        message: `Your IP submission "${formData.title}" has been received successfully`,
        payload: { ip_record_id: ipRecord.id },
      });

      await supabase.from('activity_logs').insert({
        user_id: profile.id,
        ip_record_id: ipRecord.id,
        action: 'submission_created',
        details: { title: formData.title, category: formData.category },
      });

      await supabase.from('process_tracking').insert({
        ip_record_id: ipRecord.id,
        stage: initialStage,
        status: initialStatus,
        actor_id: profile.id,
        actor_name: profile.full_name,
        actor_role: 'Applicant',
        action: 'submission_created',
        description: 'IP submission created and submitted for review',
        metadata: { title: formData.title, category: formData.category },
      });

      if (profile.email) {
        try {
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-status-notification`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              applicantEmail: profile.email,
              applicantName: profile.full_name,
              recordTitle: formData.title,
              referenceNumber: ipRecord.reference_number || 'Pending',
              oldStatus: 'draft',
              newStatus: initialStatus,
              currentStage: initialStage,
              remarks: formData.supervisorId
                ? 'Your submission has been assigned to a supervisor for review.'
                : 'Your submission has been received and will be reviewed shortly.',
              actorName: profile.full_name,
              actorRole: 'Applicant',
            }),
          });
        } catch (emailError) {
          console.error('Error sending applicant confirmation email:', emailError);
        }
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit IP record');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const nextStep = () => {
    setError('');
    if (step === 1) {
      // Check required fields
      if (!formData.title || !formData.category || !formData.abstract) {
        setError('Please fill in all required fields');
        return;
      }
      // Check abstract length
      if (formData.abstract.length > 450) {
        setError('Abstract must not exceed 450 characters. Current: ' + formData.abstract.length + ' characters. Please reduce the text.');
        return;
      }
      if (formData.abstract.length < 20) {
        setError('Abstract must be at least 20 characters long');
        return;
      }
    }
    if (step === 2 && !formData.description) {
      setError('Please provide a detailed description');
      return;
    }
    if (step === 3 && formData.inventors.some(inv => !inv.name)) {
      setError('Please fill in all inventor names');
      return;
    }
    // Skip document validation here - will validate on submit
    // Step 5 just lets users select files without validation delay
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Submission Successful!</h2>
          <p className="text-gray-600 mb-4">Your IP submission has been received and is being processed.</p>
          <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  const steps = [
    { num: 1, label: 'Basic Info' },
    { num: 2, label: 'Technical Details' },
    { num: 3, label: 'Inventors' },
    { num: 4, label: 'Commercial' },
    { num: 5, label: 'Documents' },
    { num: 6, label: 'Review' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">New IP Submission</h1>
        <p className="text-gray-600 mt-2">Complete all sections to submit your intellectual property</p>
      </div>

      <div className="mb-8 overflow-x-auto">
        <div className="flex items-center justify-between min-w-max">
          {steps.map((s, idx) => (
            <div key={s.num} className="flex items-center flex-shrink-0">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold ${
                  step >= s.num ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {s.num}
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`w-16 h-1 mx-2 ${step > s.num ? 'bg-blue-600' : 'bg-gray-200'}`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-3 text-xs font-medium text-gray-600 min-w-max">
          {steps.map(s => (
            <span key={s.num} className="w-12 text-center">{s.label}</span>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target instanceof HTMLInputElement && e.target.type !== 'submit') {
          e.preventDefault();
        }
      }}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Basic Information</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IP Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter a clear, descriptive title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IP Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Abstract <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.abstract}
                  onChange={(e) => setFormData({ ...formData, abstract: e.target.value.slice(0, 450) })}
                  required
                  rows={4}
                  maxLength={450}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 ${formData.abstract.length > 450 ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                  placeholder="Provide a concise summary (150-250 words) of your intellectual property"
                />
                <div className="flex justify-between mt-2">
                  <p className="text-xs text-gray-500">
                    Brief description of your IP work
                  </p>
                  <p className={`text-xs font-medium ${formData.abstract.length >= 450 ? 'text-red-600 font-bold' : formData.abstract.length > 400 ? 'text-orange-600' : formData.abstract.length > 350 ? 'text-blue-600' : 'text-gray-500'}`}>
                    {formData.abstract.length}/450 characters
                  </p>
                </div>
                {formData.abstract.length >= 450 && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">Abstract has reached the maximum length of 450 characters. Please reduce the text to proceed.</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Keywords
                </label>
                <div className="space-y-2">
                  {formData.keywords.map((keyword, index) => (
                    <div key={keyword.id} className="flex gap-2">
                      <input
                        type="text"
                        value={keyword.value}
                        onChange={(e) => updateKeyword(keyword.id, e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder={`Keyword ${index + 1}`}
                      />
                      {formData.keywords.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeKeyword(keyword.id)}
                          className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                          title="Remove keyword"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addKeyword}
                  className="mt-2 px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 text-sm font-medium"
                >
                  + Add Keyword
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Supervisor (Optional)
                </label>
                <p className="text-sm text-gray-500 mb-2">
                  Choose a supervisor to review your submission, or leave blank for direct evaluation
                </p>
                <select
                  value={formData.supervisorId}
                  onChange={(e) => setFormData({ ...formData, supervisorId: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No supervisor selected (Admin will assign)</option>
                  {supervisors.map((supervisor) => (
                    <option key={supervisor.id} value={supervisor.id}>
                      {supervisor.full_name} - {supervisor.affiliation || 'No affiliation'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Technical Details */}
          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Technical Details</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Detailed Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Provide a comprehensive description of your IP"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Technical Field
                </label>
                <textarea
                  value={formData.technicalField}
                  onChange={(e) => setFormData({ ...formData, technicalField: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the technical field of your invention"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Background / Prior Art
                </label>
                <textarea
                  value={formData.backgroundArt}
                  onChange={(e) => setFormData({ ...formData, backgroundArt: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe existing solutions and technologies"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Problem Statement
                </label>
                <textarea
                  value={formData.problemStatement}
                  onChange={(e) => setFormData({ ...formData, problemStatement: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="What problem does your IP solve?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proposed Solution
                </label>
                <textarea
                  value={formData.solution}
                  onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe your solution in detail"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Advantages & Benefits
                </label>
                <textarea
                  value={formData.advantages}
                  onChange={(e) => setFormData({ ...formData, advantages: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="List the key advantages of your IP"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Implementation Details
                </label>
                <textarea
                  value={formData.implementation}
                  onChange={(e) => setFormData({ ...formData, implementation: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="How is this implemented or manufactured?"
                />
              </div>
            </div>
          )}

          {/* Step 3: Inventors & Dates */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Inventors & Contributors</h3>
                <button
                  type="button"
                  onClick={addInventor}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  + Add Inventor
                </button>
              </div>

              {formData.inventors.map((inventor, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                  {formData.inventors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeInventor(index)}
                      className="absolute top-2 right-2 text-red-600 hover:text-red-700"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}

                  <h4 className="font-medium text-gray-900 mb-4">Inventor {index + 1}</h4>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={inventor.name}
                        onChange={(e) => updateInventor(index, 'name', e.target.value)}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Department
                      </label>
                      <select
                        value={inventor.affiliation}
                        onChange={(e) => updateInventor(index, 'affiliation', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select a department...</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contribution
                      </label>
                      <textarea
                        value={inventor.contribution}
                        onChange={(e) => updateInventor(index, 'contribution', e.target.value)}
                        rows={2}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Describe their contribution to this IP"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="grid md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Conceived
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.dateConceived}
                    onChange={(e) => setFormData({ ...formData, dateConceived: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    title="Date and time when the IP was conceived"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Reduced to Practice
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.dateReduced}
                    onChange={(e) => setFormData({ ...formData, dateReduced: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    title="Date and time when the IP was reduced to practice"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Funding Source
                </label>
                <input
                  type="text"
                  value={formData.funding}
                  onChange={(e) => setFormData({ ...formData, funding: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="E.g., University grant, research fund, etc."
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Collaborators / Partners
                  </label>
                  <button
                    type="button"
                    onClick={addCollaborator}
                    className="px-3 py-1 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 text-sm font-medium"
                    title="Add collaborator"
                  >
                    + Add
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.collaborators.map((collaborator, index) => (
                    <div key={collaborator.id} className="border border-gray-200 rounded-lg p-3 relative">
                      {formData.collaborators.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCollaborator(collaborator.id)}
                          className="absolute top-2 right-2 text-red-600 hover:text-red-700"
                          title="Remove collaborator"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      )}
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={collaborator.name}
                          onChange={(e) => updateCollaborator(collaborator.id, 'name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="Name"
                          title="Collaborator name"
                        />
                        <input
                          type="text"
                          value={collaborator.role}
                          onChange={(e) => updateCollaborator(collaborator.id, 'role', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="Role/Position"
                          title="Collaborator role"
                        />
                        <input
                          type="text"
                          value={collaborator.affiliation}
                          onChange={(e) => updateCollaborator(collaborator.id, 'affiliation', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="Institution/Organization"
                          title="Collaborator affiliation"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Related Publications
                </label>
                <textarea
                  value={formData.relatedPublications}
                  onChange={(e) => setFormData({ ...formData, relatedPublications: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="List any related research papers, presentations, or publications"
                />
              </div>
            </div>
          )}

          {/* Step 4: Commercial Potential */}
          {step === 4 && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Commercial Potential</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commercial Potential
                </label>
                <textarea
                  value={formData.commercialPotential}
                  onChange={(e) => setFormData({ ...formData, commercialPotential: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the commercial potential and market opportunities"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Market
                </label>
                <textarea
                  value={formData.targetMarket}
                  onChange={(e) => setFormData({ ...formData, targetMarket: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Who are the potential users or customers?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Competitive Advantage
                </label>
                <textarea
                  value={formData.competitiveAdvantage}
                  onChange={(e) => setFormData({ ...formData, competitiveAdvantage: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="What makes this IP unique compared to competitors?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Market Value
                </label>
                <input
                  type="text"
                  value={formData.estimatedValue}
                  onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Estimated value or market size"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prior Art References
                </label>
                <textarea
                  value={formData.priorArt}
                  onChange={(e) => setFormData({ ...formData, priorArt: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="List any relevant prior art, patents, or existing technologies"
                />
              </div>
            </div>
          )}

          {/* Step 5: Document Upload */}
          {step === 5 && (
            <DocumentUploadSection
              uploadedFiles={uploadedFiles}
              onFilesAdded={(files) => setUploadedFiles([...uploadedFiles, ...files])}
              onFileRemoved={removeFile}
              onError={setError}
              maxTotalSize={50}
              maxFileSize={MAX_FILE_SIZE / (1024 * 1024)}
              uploadProgress={uploadProgress}
              isUploading={uploading}
            />
          )}

          {/* Step 6: Review & Submit */}
          {step === 6 && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Review & Submit</h3>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="font-bold text-blue-900 mb-4">Submission Summary</h4>
                <dl className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="font-medium text-blue-700">Title:</dt>
                    <dd className="text-blue-900">{formData.title}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-blue-700">Category:</dt>
                    <dd className="text-blue-900 capitalize">{formData.category}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-blue-700">Inventors:</dt>
                    <dd className="text-blue-900">{formData.inventors.length} person(s)</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-blue-700">Documents:</dt>
                    <dd className="text-blue-900">{uploadedFiles.length} file(s)</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-blue-700">Supervisor:</dt>
                    <dd className="text-blue-900">{formData.supervisorId ? supervisors.find(s => s.id === formData.supervisorId)?.full_name : 'Not assigned'}</dd>
                  </div>
                  <div className="md:col-span-2">
                    <dt className="font-medium text-blue-700">Abstract:</dt>
                    <dd className="text-blue-900">{formData.abstract.substring(0, 150)}...</dd>
                  </div>
                </dl>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-bold text-gray-900 mb-4">Documents ({uploadedFiles.length})</h4>
                {uploadedFiles.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <FileIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{file.file.name}</p>
                            <p className="text-xs text-gray-500">{(file.file.size / 1024 / 1024).toFixed(2)}MB</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">ℹ️ No documents uploaded. That's okay! A disclosure form will be auto-generated after submission.</p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>📋 Disclosure Form:</strong> After you submit, a disclosure form will be automatically generated and available for download from your dashboard.
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Final Confirmation:</strong> By clicking Submit, you confirm that all information provided is accurate and complete.
                  Your submission will be reviewed by the assigned supervisor and evaluator.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            {step > 1 ? (
              <button
                type="button"
                onClick={prevStep}
                disabled={loading}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Previous
              </button>
            ) : (
              <div></div>
            )}

            {step < 6 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading || uploading}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (uploading ? 'Uploading...' : 'Submitting...') : 'Submit IP'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
