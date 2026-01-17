'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { sopsApi, exportsApi, videosApi, integrationsApi } from '@/lib/api';
import { getScreenshotUrl, formatDate } from '@/lib/utils';
import type { SOP, SOPStep, ClickAnnotation } from '@/types';
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  MousePointer2,
  Edit2,
  Save,
  X,
  Trash2,
  Plus,
  GripVertical,
  Image as ImageIcon,
  Check,
  ChevronUp,
  ChevronDown,
  FileDown,
} from 'lucide-react';

interface Frame {
  id: string;
  frame_number: number;
  timestamp_ms: number;
  frame_path: string;
  thumbnail_path: string;
}

export default function SOPViewPage() {
  const params = useParams();
  const router = useRouter();
  const sopId = params.sopId as string;

  const [sop, setSOP] = useState<SOP | null>(null);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [selectingScreenshotForStep, setSelectingScreenshotForStep] = useState<string | null>(null);
  const [editingClicksForStep, setEditingClicksForStep] = useState<string | null>(null);
  const [addingStepAfter, setAddingStepAfter] = useState<number | null>(null); // step number to add after, or 0 for beginning
  const [showNotionModal, setShowNotionModal] = useState(false);

  useEffect(() => {
    loadSOP();
  }, [sopId]);

  const loadSOP = async () => {
    try {
      const response = await sopsApi.get(sopId);
      setSOP(response.data);

      // Load video frames if video_id exists - load ALL frames for editing, not just scene changes
      if (response.data.video_id) {
        try {
          // Load all frames (scene_changes_only = false) with a higher page size
          const framesResponse = await videosApi.getFrames(response.data.video_id, false, 1, 500);
          setFrames(framesResponse.data);
        } catch (e) {
          console.error('Failed to load frames:', e);
        }
      }
    } catch (error) {
      console.error('Failed to load SOP:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStep = async (stepId: string, updates: Partial<SOPStep>) => {
    if (!sop) return;
    setSaving(true);
    try {
      await sopsApi.updateStep(sopId, stepId, {
        title: updates.title ?? undefined,
        description: updates.description ?? undefined,
        screenshot_path: updates.screenshot_path ?? undefined,
      });
      // Update local state
      setSOP({
        ...sop,
        steps: sop.steps.map((s) =>
          s.id === stepId ? { ...s, ...updates } : s
        ),
      });
      setEditingStepId(null);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!sop || !confirm('Delete this step?')) return;
    setSaving(true);
    try {
      await sopsApi.deleteStep(sopId, stepId);
      setSOP({
        ...sop,
        steps: sop.steps.filter((s) => s.id !== stepId),
        total_steps: sop.total_steps - 1,
      });
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveStep = async (stepId: string, direction: 'up' | 'down') => {
    if (!sop) return;
    const currentIndex = sop.steps.findIndex((s) => s.id === stepId);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === sop.steps.length - 1)
    ) {
      return;
    }

    const newSteps = [...sop.steps];
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    [newSteps[currentIndex], newSteps[swapIndex]] = [newSteps[swapIndex], newSteps[currentIndex]];

    // Update step numbers
    const stepIds = newSteps.map((s) => s.id);

    setSaving(true);
    try {
      await sopsApi.reorder(sopId, stepIds);
      // Update local state with new order
      setSOP({
        ...sop,
        steps: newSteps.map((s, i) => ({ ...s, step_number: i + 1 })),
      });
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to reorder');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectScreenshot = async (stepId: string, frame: Frame) => {
    if (!sop) return;
    setSaving(true);
    try {
      // Update the step's screenshot path
      await sopsApi.updateStep(sopId, stepId, {
        screenshot_path: frame.frame_path,
      });
      setSOP({
        ...sop,
        steps: sop.steps.map((s) =>
          s.id === stepId
            ? { ...s, screenshot_path: frame.frame_path, annotated_screenshot_path: null }
            : s
        ),
      });
      setSelectingScreenshotForStep(null);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to update screenshot');
    } finally {
      setSaving(false);
    }
  };

  const handleAddClickAnnotation = async (
    stepId: string,
    annotation: { x_percentage: number; y_percentage: number; element_description: string }
  ) => {
    if (!sop) return;
    setSaving(true);
    try {
      const response = await sopsApi.addAnnotation(sopId, stepId, {
        x_coordinate: Math.round(annotation.x_percentage * 10), // Approximate pixel coords
        y_coordinate: Math.round(annotation.y_percentage * 10),
        x_percentage: annotation.x_percentage,
        y_percentage: annotation.y_percentage,
        click_type: 'left_click',
        element_description: annotation.element_description,
        sequence_order:
          (sop.steps.find((s) => s.id === stepId)?.click_annotations.length || 0) + 1,
      });
      // Update local state
      setSOP({
        ...sop,
        steps: sop.steps.map((s) =>
          s.id === stepId
            ? { ...s, click_annotations: [...s.click_annotations, response.data] }
            : s
        ),
      });
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to add annotation');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClickAnnotation = async (stepId: string, annotationId: string) => {
    if (!sop) return;
    setSaving(true);
    try {
      await sopsApi.removeAnnotation(sopId, stepId, annotationId);
      setSOP({
        ...sop,
        steps: sop.steps.map((s) =>
          s.id === stepId
            ? {
                ...s,
                click_annotations: s.click_annotations.filter((a) => a.id !== annotationId),
              }
            : s
        ),
      });
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete annotation');
    } finally {
      setSaving(false);
    }
  };

  const handleClearAllAnnotations = async (stepId: string) => {
    if (!sop || !confirm('Clear all click markers from this step?')) return;
    setSaving(true);
    try {
      await sopsApi.clearAnnotations(sopId, stepId);
      setSOP({
        ...sop,
        steps: sop.steps.map((s) =>
          s.id === stepId ? { ...s, click_annotations: [] } : s
        ),
      });
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to clear annotations');
    } finally {
      setSaving(false);
    }
  };

  const handleAddStep = async (afterStepNumber: number, title: string, description: string) => {
    if (!sop) return;
    setSaving(true);
    try {
      const response = await sopsApi.createStep(sopId, {
        step_number: afterStepNumber + 1,
        title,
        description,
      });
      // Reload SOP to get updated step numbers
      await loadSOP();
      setAddingStepAfter(null);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to add step');
    } finally {
      setSaving(false);
    }
  };

  const handleExportNotion = async (config?: { database_id?: string; parent_page_id?: string }) => {
    setExporting('notion');
    setShowNotionModal(false);
    try {
      await exportsApi.toNotion(sopId, config);
      alert('Export started! Check the Exports page for status.');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  const handleExportPdf = async () => {
    setExporting('pdf');
    try {
      const response = await exportsApi.toPdf(sopId);
      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${sop?.title || 'sop'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'PDF export failed');
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!sop) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">SOP not found</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" onClick={() => router.push('/sops')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to SOPs
        </Button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{sop.title}</h1>
            {sop.description && <p className="text-gray-600 mt-2">{sop.description}</p>}
            <p className="text-sm text-gray-500 mt-2">
              Created {formatDate(sop.created_at)} | {sop.steps.length} steps
            </p>
          </div>

          <div className="flex space-x-2">
            <Button
              variant={editMode ? 'default' : 'outline'}
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Done Editing
                </>
              ) : (
                <>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit SOP
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleExportPdf}
              disabled={exporting !== null}
            >
              {exporting === 'pdf' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <FileDown className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowNotionModal(true)}
              disabled={exporting !== null}
            >
              {exporting === 'notion' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Download className="h-4 w-4 mr-2" />
              Notion
            </Button>
          </div>
        </div>

        {editMode && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Edit Mode:</strong> Click on any step to edit its title/description.
              Use the buttons to change screenshots, edit click markers, reorder, or delete steps.
            </p>
          </div>
        )}
      </div>

      {/* Screenshot Selector Modal */}
      {selectingScreenshotForStep && (
        <ScreenshotSelector
          frames={frames}
          videoId={sop.video_id || ''}
          onSelect={(frame) => handleSelectScreenshot(selectingScreenshotForStep, frame)}
          onClose={() => setSelectingScreenshotForStep(null)}
        />
      )}

      {/* Notion Export Modal */}
      {showNotionModal && (
        <NotionExportModal
          onExport={handleExportNotion}
          onClose={() => setShowNotionModal(false)}
        />
      )}

      {/* Add Step Modal */}
      {addingStepAfter !== null && (
        <AddStepModal
          afterStepNumber={addingStepAfter}
          onAdd={(title, description) => handleAddStep(addingStepAfter, title, description)}
          onClose={() => setAddingStepAfter(null)}
          saving={saving}
        />
      )}

      {/* Steps */}
      <div className="space-y-4">
        {/* Add step at beginning button */}
        {editMode && (
          <AddStepButton onClick={() => setAddingStepAfter(0)} label="Add step at beginning" />
        )}

        {sop.steps.map((step, index) => (
          <div key={step.id}>
            <StepCard
              step={step}
              editMode={editMode}
              isEditing={editingStepId === step.id}
              isEditingClicks={editingClicksForStep === step.id}
              saving={saving}
              isFirst={index === 0}
              isLast={index === sop.steps.length - 1}
              onStartEdit={() => setEditingStepId(step.id)}
              onCancelEdit={() => setEditingStepId(null)}
              onSave={(updates) => handleSaveStep(step.id, updates)}
              onDelete={() => handleDeleteStep(step.id)}
              onMoveUp={() => handleMoveStep(step.id, 'up')}
              onMoveDown={() => handleMoveStep(step.id, 'down')}
              onSelectScreenshot={() => setSelectingScreenshotForStep(step.id)}
              onToggleEditClicks={() =>
                setEditingClicksForStep(editingClicksForStep === step.id ? null : step.id)
              }
              onAddClick={(annotation) => handleAddClickAnnotation(step.id, annotation)}
              onDeleteClick={(annotationId) => handleDeleteClickAnnotation(step.id, annotationId)}
              onClearAllClicks={() => handleClearAllAnnotations(step.id)}
            />
            {/* Add step after this one button */}
            {editMode && (
              <AddStepButton onClick={() => setAddingStepAfter(step.step_number)} label={`Add step after step ${step.step_number}`} />
            )}
          </div>
        ))}

        {/* Add step at end button (if no steps) */}
        {editMode && sop.steps.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No steps yet</p>
            <Button onClick={() => setAddingStepAfter(0)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Step
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function StepCard({
  step,
  editMode,
  isEditing,
  isEditingClicks,
  saving,
  isFirst,
  isLast,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onMoveUp,
  onMoveDown,
  onSelectScreenshot,
  onToggleEditClicks,
  onAddClick,
  onDeleteClick,
  onClearAllClicks,
}: {
  step: SOPStep;
  editMode: boolean;
  isEditing: boolean;
  isEditingClicks: boolean;
  saving: boolean;
  isFirst: boolean;
  isLast: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (updates: Partial<SOPStep>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSelectScreenshot: () => void;
  onToggleEditClicks: () => void;
  onAddClick: (annotation: { x_percentage: number; y_percentage: number; element_description: string }) => void;
  onDeleteClick: (annotationId: string) => void;
  onClearAllClicks: () => void;
}) {
  const [title, setTitle] = useState(step.title || '');
  const [description, setDescription] = useState(step.description || '');

  const screenshotUrl = step.annotated_screenshot_path
    ? getScreenshotUrl(step.annotated_screenshot_path)
    : step.screenshot_path
    ? getScreenshotUrl(step.screenshot_path)
    : null;

  const handleSave = () => {
    onSave({ title, description });
  };

  return (
    <Card className={editMode ? 'border-blue-200' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center flex-1">
            {editMode && (
              <div className="flex flex-col mr-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={onMoveUp}
                  disabled={isFirst || saving}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={onMoveDown}
                  disabled={isLast || saving}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            )}
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold mr-3">
              {step.step_number}
            </span>
            {isEditing ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Step title..."
                className="flex-1"
              />
            ) : (
              <span className="flex-1">{step.title || `Step ${step.step_number}`}</span>
            )}
          </CardTitle>

          {editMode && (
            <div className="flex space-x-1">
              {isEditing ? (
                <>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={onCancelEdit}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="ghost" onClick={onStartEdit}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={onSelectScreenshot}>
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={isEditingClicks ? 'default' : 'ghost'}
                    onClick={onToggleEditClicks}
                  >
                    <MousePointer2 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={onDelete} className="text-red-500 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {screenshotUrl && (
          <ClickableScreenshot
            src={screenshotUrl}
            annotations={step.click_annotations}
            isEditing={isEditingClicks}
            onAddClick={onAddClick}
            onDeleteClick={onDeleteClick}
          />
        )}

        {/* Click Marker Editor Panel - shown when editing clicks */}
        {isEditingClicks && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-blue-900">Click Marker Editor</h4>
              {step.click_annotations.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={onClearAllClicks}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear All Markers
                </Button>
              )}
            </div>
            <p className="text-sm text-blue-700 mb-3">
              Click on the screenshot to add markers. Markers are numbered in the order added.
            </p>
            {step.click_annotations.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-blue-600 font-medium">Current Markers:</p>
                {step.click_annotations
                  .sort((a, b) => a.sequence_order - b.sequence_order)
                  .map((annotation) => (
                    <div
                      key={annotation.id}
                      className="flex items-center justify-between bg-white p-2 rounded border"
                    >
                      <div className="flex items-center">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold mr-2">
                          {annotation.sequence_order}
                        </span>
                        <span className="text-sm">
                          {annotation.element_description || 'Click marker'}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        onClick={() => onDeleteClick(annotation.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-blue-600 italic">No markers added yet. Click on the screenshot above to add markers.</p>
            )}
          </div>
        )}

        {isEditing ? (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Step description..."
            rows={3}
            className="w-full mt-4 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        ) : (
          <p className="text-gray-700 leading-relaxed mt-4">{step.description}</p>
        )}

        {/* Click Actions - shown when NOT editing clicks */}
        {step.click_annotations.length > 0 && !isEditingClicks && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <MousePointer2 className="h-4 w-4 mr-1" />
              Click Actions ({step.click_annotations.length}):
            </p>
            <ul className="text-sm text-gray-600 space-y-1">
              {step.click_annotations
                .sort((a, b) => a.sequence_order - b.sequence_order)
                .map((annotation) => (
                  <li key={annotation.id} className="flex items-start">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-medium mr-2 mt-0.5">
                      {annotation.sequence_order}
                    </span>
                    <span>
                      {annotation.action_description || annotation.element_description || 'Click'}
                      {annotation.click_type !== 'left_click' && (
                        <span className="text-gray-400 ml-1">
                          ({annotation.click_type.replace('_', ' ')})
                        </span>
                      )}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ClickableScreenshot({
  src,
  annotations,
  isEditing,
  onAddClick,
  onDeleteClick,
}: {
  src: string;
  annotations: ClickAnnotation[];
  isEditing: boolean;
  onAddClick: (annotation: { x_percentage: number; y_percentage: number; element_description: string }) => void;
  onDeleteClick: (annotationId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    if (!isEditing || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const description = prompt('Enter description for this click (optional):') || '';
    onAddClick({ x_percentage: x, y_percentage: y, element_description: description });
  };

  return (
    <div
      ref={containerRef}
      className={`relative border rounded-lg overflow-hidden ${isEditing ? 'cursor-crosshair ring-2 ring-blue-400' : ''}`}
      onClick={handleClick}
    >
      {isEditing && (
        <div className="absolute top-2 left-2 z-10 bg-blue-600 text-white text-xs px-2 py-1 rounded">
          Click anywhere to add a marker. Click a marker to delete it.
        </div>
      )}
      <img src={src} alt="Step screenshot" className="w-full h-auto" />
      {annotations.map((annotation) => (
        <div
          key={annotation.id}
          className={`absolute flex items-center justify-center w-8 h-8 rounded-full bg-red-500 text-white text-sm font-bold shadow-lg transform -translate-x-1/2 -translate-y-1/2 border-2 border-white ${
            isEditing ? 'cursor-pointer hover:bg-red-700' : ''
          }`}
          style={{
            left: `${annotation.x_percentage}%`,
            top: `${annotation.y_percentage}%`,
          }}
          title={annotation.element_description || annotation.action_description || 'Click to delete'}
          onClick={(e) => {
            e.stopPropagation();
            if (isEditing && confirm('Delete this click marker?')) {
              onDeleteClick(annotation.id);
            }
          }}
        >
          {annotation.sequence_order}
        </div>
      ))}
    </div>
  );
}

function ScreenshotSelector({
  frames,
  videoId,
  onSelect,
  onClose,
}: {
  frames: Frame[];
  videoId: string;
  onSelect: (frame: Frame) => void;
  onClose: () => void;
}) {
  const getFrameUrl = (frame: Frame) => {
    // Use the stored thumbnail_path or file_path and convert to URL
    const path = frame.thumbnail_path || frame.frame_path;
    if (!path) return '';
    return getScreenshotUrl(path);
  };

  const getFullFrameUrl = (frame: Frame) => {
    return getScreenshotUrl(frame.frame_path);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[85vh] overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Select Screenshot</h3>
            <p className="text-sm text-gray-500">{frames.length} frames available</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[70vh]">
          {frames.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No frames available. Process the video to extract frames.</p>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {frames.map((frame) => (
                <div
                  key={frame.id}
                  className="relative cursor-pointer border-2 border-transparent hover:border-blue-500 rounded-lg overflow-hidden group"
                  onClick={() => onSelect(frame)}
                >
                  <img
                    src={getFrameUrl(frame)}
                    alt={`Frame at ${Math.floor(frame.timestamp_ms / 1000)}s`}
                    className="w-full aspect-video object-cover bg-gray-100"
                    onError={(e) => {
                      // Fallback to full frame
                      (e.target as HTMLImageElement).src = getFullFrameUrl(frame);
                    }}
                  />
                  <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/20 transition-colors" />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1.5 flex justify-between">
                    <span>{formatTimestamp(frame.timestamp_ms)}</span>
                    <span className="text-gray-300">#{frame.frame_number}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function AddStepButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <div className="flex justify-center py-2">
      <Button
        variant="outline"
        size="sm"
        className="border-dashed border-2 text-gray-500 hover:text-blue-600 hover:border-blue-400"
        onClick={onClick}
      >
        <Plus className="h-4 w-4 mr-1" />
        {label}
      </Button>
    </div>
  );
}

function AddStepModal({
  afterStepNumber,
  onAdd,
  onClose,
  saving,
}: {
  afterStepNumber: number;
  onAdd: (title: string, description: string) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      alert('Please enter a description');
      return;
    }
    onAdd(title.trim(), description.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            {afterStepNumber === 0 ? 'Add First Step' : `Add Step After Step ${afterStepNumber}`}
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title (optional)</label>
            <Input
              placeholder="e.g., Click the Submit button"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description *</label>
            <textarea
              placeholder="Describe what the user should do in this step..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !description.trim()}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Step
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface NotionPage {
  id: string;
  title: string;
  url: string;
}

function NotionExportModal({
  onExport,
  onClose,
}: {
  onExport: (config?: { database_id?: string; parent_page_id?: string }) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">Export to Notion</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-gray-600">
            This will create a new page in your Notion workspace with the SOP content and screenshots.
          </p>
          <p className="text-sm text-gray-500">
            The page will be created under the first available page in your workspace that the integration has access to.
          </p>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Make sure your Notion integration has access to at least one page in your workspace.
            </p>
          </div>
        </div>
        <div className="p-4 border-t flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onExport()}>
            <Download className="h-4 w-4 mr-2" />
            Export to Notion
          </Button>
        </div>
      </div>
    </div>
  );
}
