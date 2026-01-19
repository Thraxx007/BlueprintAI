'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Pause, SkipBack, SkipForward, Plus, Trash2, Edit2, Check, X, FileText } from 'lucide-react';

export interface VideoSegment {
  id: string;
  startTime: number;
  endTime: number;
  label: string;
  color: string;
}

interface MultiSegmentSelectorProps {
  videoUrl: string;
  duration: number;
  segments: VideoSegment[];
  onSegmentsChange: (segments: VideoSegment[]) => void;
  onCreateSOP?: (segment: VideoSegment) => void;
}

// Generate distinct colors for segments
const SEGMENT_COLORS = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
];

function getNextColor(usedColors: string[]): string {
  const available = SEGMENT_COLORS.filter(c => !usedColors.includes(c));
  if (available.length > 0) return available[0];
  return SEGMENT_COLORS[usedColors.length % SEGMENT_COLORS.length];
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function MultiSegmentSelector({
  videoUrl,
  duration,
  segments,
  onSegmentsChange,
  onCreateSOP,
}: MultiSegmentSelectorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isDragging, setIsDragging] = useState<{ segmentId: string; handle: 'start' | 'end' } | 'playhead' | null>(null);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState('');
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);

  // Video time update
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimePrecise = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const seekTo = (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(duration, time));
    setCurrentTime(video.currentTime);
  };

  const jumpToStart = () => {
    seekTo(0);
  };

  const jumpToEnd = () => {
    seekTo(duration - 0.1);
  };

  const getPositionFromEvent = useCallback((e: React.MouseEvent | MouseEvent): number => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    return (x / rect.width) * duration;
  }, [duration]);

  // Add new segment at current playhead position
  const addSegment = () => {
    const usedColors = segments.map(s => s.color);
    const newSegment: VideoSegment = {
      id: generateId(),
      startTime: Math.max(0, currentTime - 5),
      endTime: Math.min(duration, currentTime + 5),
      label: `Segment ${segments.length + 1}`,
      color: getNextColor(usedColors),
    };
    onSegmentsChange([...segments, newSegment]);
    setSelectedSegmentId(newSegment.id);
  };

  // Remove a segment
  const removeSegment = (id: string) => {
    onSegmentsChange(segments.filter(s => s.id !== id));
    if (selectedSegmentId === id) {
      setSelectedSegmentId(null);
    }
  };

  // Start editing a segment label
  const startEditingLabel = (segment: VideoSegment) => {
    setEditingLabelId(segment.id);
    setEditingLabelValue(segment.label);
  };

  // Save the edited label
  const saveLabel = (id: string) => {
    onSegmentsChange(segments.map(s =>
      s.id === id ? { ...s, label: editingLabelValue || `Segment ${segments.indexOf(s) + 1}` } : s
    ));
    setEditingLabelId(null);
    setEditingLabelValue('');
  };

  // Cancel editing
  const cancelEditLabel = () => {
    setEditingLabelId(null);
    setEditingLabelValue('');
  };

  // Set current position as segment start/end
  const setSegmentStart = (id: string) => {
    const segment = segments.find(s => s.id === id);
    if (!segment) return;
    const newStart = Math.min(currentTime, segment.endTime - 1);
    onSegmentsChange(segments.map(s =>
      s.id === id ? { ...s, startTime: newStart } : s
    ));
  };

  const setSegmentEnd = (id: string) => {
    const segment = segments.find(s => s.id === id);
    if (!segment) return;
    const newEnd = Math.max(currentTime, segment.startTime + 1);
    onSegmentsChange(segments.map(s =>
      s.id === id ? { ...s, endTime: newEnd } : s
    ));
  };

  // Handle timeline mouse events
  const handleTimelineClick = (e: React.MouseEvent) => {
    // Only seek if clicking on the timeline background
    if (e.target === timelineRef.current || (e.target as HTMLElement).classList.contains('timeline-bg')) {
      const time = getPositionFromEvent(e);
      seekTo(time);
    }
  };

  const handleSegmentHandleMouseDown = (e: React.MouseEvent, segmentId: string, handle: 'start' | 'end') => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging({ segmentId, handle });
    setSelectedSegmentId(segmentId);
  };

  const handlePlayheadMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging('playhead');
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const time = getPositionFromEvent(e);

    if (isDragging === 'playhead') {
      seekTo(time);
    } else {
      const { segmentId, handle } = isDragging;
      const segment = segments.find(s => s.id === segmentId);
      if (!segment) return;

      if (handle === 'start') {
        const newStart = Math.min(time, segment.endTime - 1);
        onSegmentsChange(segments.map(s =>
          s.id === segmentId ? { ...s, startTime: Math.max(0, newStart) } : s
        ));
      } else {
        const newEnd = Math.max(time, segment.startTime + 1);
        onSegmentsChange(segments.map(s =>
          s.id === segmentId ? { ...s, endTime: Math.min(duration, newEnd) } : s
        ));
      }
    }
  }, [isDragging, segments, duration, getPositionFromEvent, onSegmentsChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Play within selected segment
  const playSegment = (segment: VideoSegment) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = segment.startTime;
    video.play();
    setIsPlaying(true);
    setSelectedSegmentId(segment.id);
  };

  const currentPercent = (currentTime / duration) * 100;
  const selectedSegment = segments.find(s => s.id === selectedSegmentId);

  return (
    <div className="space-y-4">
      {/* Video Preview */}
      <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          preload="metadata"
        />
        {selectedSegment && (
          <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
            {selectedSegment.label}
          </div>
        )}
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="icon" onClick={jumpToStart}>
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={togglePlay}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button variant="outline" size="icon" onClick={jumpToEnd}>
          <SkipForward className="h-4 w-4" />
        </Button>
        <span className="ml-4 text-sm font-mono tabular-nums">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <Button
          variant="default"
          size="sm"
          onClick={addSegment}
          className="ml-4"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Segment
        </Button>
      </div>

      {/* Timeline with Multiple Segments */}
      <div className="space-y-2">
        <Label>Video Timeline</Label>
        <div
          ref={timelineRef}
          className="timeline-bg relative h-16 bg-gray-200 rounded-lg cursor-pointer select-none overflow-hidden"
          onClick={handleTimelineClick}
        >
          {/* Segment regions */}
          {segments.map((segment) => {
            const startPercent = (segment.startTime / duration) * 100;
            const widthPercent = ((segment.endTime - segment.startTime) / duration) * 100;
            const isSelected = selectedSegmentId === segment.id;

            return (
              <div key={segment.id} className="absolute top-0 bottom-0" style={{ left: `${startPercent}%`, width: `${widthPercent}%` }}>
                {/* Segment background */}
                <div
                  className={`absolute inset-0 transition-all ${isSelected ? 'ring-2 ring-offset-1 ring-gray-900' : ''}`}
                  style={{ backgroundColor: `${segment.color}40` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSegmentId(segment.id);
                  }}
                >
                  {/* Segment label in timeline */}
                  <div
                    className="absolute top-1 left-1 right-1 text-xs font-medium truncate px-1 rounded"
                    style={{ color: segment.color }}
                  >
                    {segment.label}
                  </div>
                </div>

                {/* Start handle */}
                <div
                  className="absolute top-0 bottom-0 w-2 cursor-ew-resize hover:w-3 transition-all z-10"
                  style={{
                    left: 0,
                    backgroundColor: segment.color,
                    borderTopLeftRadius: '4px',
                    borderBottomLeftRadius: '4px',
                  }}
                  onMouseDown={(e) => handleSegmentHandleMouseDown(e, segment.id, 'start')}
                >
                  <div className="w-0.5 h-8 bg-white/50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full" />
                </div>

                {/* End handle */}
                <div
                  className="absolute top-0 bottom-0 w-2 cursor-ew-resize hover:w-3 transition-all z-10"
                  style={{
                    right: 0,
                    backgroundColor: segment.color,
                    borderTopRightRadius: '4px',
                    borderBottomRightRadius: '4px',
                  }}
                  onMouseDown={(e) => handleSegmentHandleMouseDown(e, segment.id, 'end')}
                >
                  <div className="w-0.5 h-8 bg-white/50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full" />
                </div>
              </div>
            );
          })}

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-red-500 cursor-ew-resize z-20"
            style={{ left: `calc(${currentPercent}% - 2px)` }}
            onMouseDown={handlePlayheadMouseDown}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full" />
          </div>

          {/* Time markers */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-[10px] text-gray-500 pointer-events-none">
            <span>0:00</span>
            <span>{formatTime(duration / 4)}</span>
            <span>{formatTime(duration / 2)}</span>
            <span>{formatTime((duration * 3) / 4)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* Segment List */}
      {segments.length > 0 && (
        <div className="space-y-2">
          <Label>Segments ({segments.length})</Label>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {segments.map((segment, index) => {
              const isSelected = selectedSegmentId === segment.id;
              const isEditing = editingLabelId === segment.id;

              return (
                <div
                  key={segment.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    isSelected ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedSegmentId(segment.id)}
                >
                  {/* Color indicator */}
                  <div
                    className="w-3 h-8 rounded-full flex-shrink-0"
                    style={{ backgroundColor: segment.color }}
                  />

                  {/* Label */}
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingLabelValue}
                          onChange={(e) => setEditingLabelValue(e.target.value)}
                          className="h-7 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveLabel(segment.id);
                            if (e.key === 'Escape') cancelEditLabel();
                          }}
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => saveLabel(segment.id)}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEditLabel}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{segment.label}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-50 hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditingLabel(segment);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    <div className="text-xs text-gray-500 font-mono">
                      {formatTimePrecise(segment.startTime)} - {formatTimePrecise(segment.endTime)}
                      <span className="ml-2 text-gray-400">
                        ({formatTime(segment.endTime - segment.startTime)})
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSegmentStart(segment.id);
                      }}
                      title="Set start to current time"
                    >
                      Set Start
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSegmentEnd(segment.id);
                      }}
                      title="Set end to current time"
                    >
                      Set End
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        playSegment(segment);
                      }}
                      title="Play this segment"
                    >
                      <Play className="h-3 w-3" />
                    </Button>
                    {onCreateSOP && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCreateSOP(segment);
                        }}
                        title="Create SOP from this segment"
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Create SOP
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSegment(segment.id);
                      }}
                      title="Remove segment"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {segments.length === 0 && (
        <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
          <p className="mb-2">No segments defined yet</p>
          <p className="text-sm">
            Click "Add Segment" to mark portions of the video for SOP creation.
          </p>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Define multiple segments by dragging the colored handles on the timeline.
        Each segment can be used to create a separate SOP.
      </p>
    </div>
  );
}
