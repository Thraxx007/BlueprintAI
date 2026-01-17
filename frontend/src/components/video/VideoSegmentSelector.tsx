'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Play, Pause, SkipBack, SkipForward, Scissors } from 'lucide-react';

interface VideoSegmentSelectorProps {
  videoUrl: string;
  duration: number;
  onSegmentChange: (startTime: number | null, endTime: number | null) => void;
  initialStartTime?: number;
  initialEndTime?: number;
}

export function VideoSegmentSelector({
  videoUrl,
  duration,
  onSegmentChange,
  initialStartTime,
  initialEndTime,
}: VideoSegmentSelectorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [useSegment, setUseSegment] = useState(
    initialStartTime !== undefined || initialEndTime !== undefined
  );
  const [startTime, setStartTime] = useState(initialStartTime || 0);
  const [endTime, setEndTime] = useState(initialEndTime || duration);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'playhead' | null>(null);

  // Update parent when segment changes
  useEffect(() => {
    if (useSegment) {
      onSegmentChange(startTime, endTime);
    } else {
      onSegmentChange(null, null);
    }
  }, [useSegment, startTime, endTime, onSegmentChange]);

  // Update endTime when duration changes
  useEffect(() => {
    if (!initialEndTime && duration > 0) {
      setEndTime(duration);
    }
  }, [duration, initialEndTime]);

  // Video time update
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);

      // Loop within segment if using segment mode
      if (useSegment && video.currentTime >= endTime) {
        video.currentTime = startTime;
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [useSegment, startTime, endTime]);

  const formatTime = (seconds: number): string => {
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
      // If using segment and outside segment, jump to start
      if (useSegment && (video.currentTime < startTime || video.currentTime >= endTime)) {
        video.currentTime = startTime;
      }
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
    seekTo(useSegment ? startTime : 0);
  };

  const jumpToEnd = () => {
    seekTo(useSegment ? endTime - 0.1 : duration - 0.1);
  };

  const setCurrentAsStart = () => {
    const newStart = Math.min(currentTime, endTime - 1);
    setStartTime(newStart);
  };

  const setCurrentAsEnd = () => {
    const newEnd = Math.max(currentTime, startTime + 1);
    setEndTime(newEnd);
  };

  const getPositionFromEvent = useCallback((e: React.MouseEvent | MouseEvent): number => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    return (x / rect.width) * duration;
  }, [duration]);

  const handleTimelineMouseDown = (e: React.MouseEvent, type: 'start' | 'end' | 'playhead') => {
    e.preventDefault();
    setIsDragging(type);

    if (type === 'playhead') {
      const time = getPositionFromEvent(e);
      seekTo(time);
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const time = getPositionFromEvent(e);

    if (isDragging === 'start') {
      setStartTime(Math.min(time, endTime - 1));
    } else if (isDragging === 'end') {
      setEndTime(Math.max(time, startTime + 1));
    } else if (isDragging === 'playhead') {
      seekTo(time);
    }
  }, [isDragging, endTime, startTime, getPositionFromEvent]);

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

  const startPercent = (startTime / duration) * 100;
  const endPercent = (endTime / duration) * 100;
  const currentPercent = (currentTime / duration) * 100;

  return (
    <div className="space-y-4">
      {/* Video Preview */}
      <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          onEnded={() => setIsPlaying(false)}
          preload="metadata"
        />
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
      </div>

      {/* Segment Toggle */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={useSegment}
            onChange={(e) => setUseSegment(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium">Select specific segment</span>
        </label>
      </div>

      {/* Timeline with Range Selector */}
      {useSegment && (
        <div className="space-y-3">
          <Label>Select Video Segment</Label>

          {/* Timeline */}
          <div
            ref={timelineRef}
            className="relative h-12 bg-gray-200 rounded-lg cursor-pointer select-none"
            onMouseDown={(e) => {
              // Click on timeline to seek
              if (e.target === timelineRef.current) {
                handleTimelineMouseDown(e, 'playhead');
              }
            }}
          >
            {/* Selected Range Background */}
            <div
              className="absolute top-0 bottom-0 bg-blue-100"
              style={{
                left: `${startPercent}%`,
                width: `${endPercent - startPercent}%`,
              }}
            />

            {/* Unselected regions (darker) */}
            <div
              className="absolute top-0 bottom-0 bg-gray-400/50 rounded-l-lg"
              style={{
                left: 0,
                width: `${startPercent}%`,
              }}
            />
            <div
              className="absolute top-0 bottom-0 bg-gray-400/50 rounded-r-lg"
              style={{
                left: `${endPercent}%`,
                width: `${100 - endPercent}%`,
              }}
            />

            {/* Start Handle */}
            <div
              className="absolute top-0 bottom-0 w-3 bg-blue-600 cursor-ew-resize rounded-l-md hover:bg-blue-700 transition-colors flex items-center justify-center"
              style={{ left: `calc(${startPercent}% - 6px)` }}
              onMouseDown={(e) => handleTimelineMouseDown(e, 'start')}
            >
              <div className="w-0.5 h-6 bg-white rounded-full" />
            </div>

            {/* End Handle */}
            <div
              className="absolute top-0 bottom-0 w-3 bg-blue-600 cursor-ew-resize rounded-r-md hover:bg-blue-700 transition-colors flex items-center justify-center"
              style={{ left: `calc(${endPercent}% - 6px)` }}
              onMouseDown={(e) => handleTimelineMouseDown(e, 'end')}
            >
              <div className="w-0.5 h-6 bg-white rounded-full" />
            </div>

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-red-500 cursor-ew-resize z-10"
              style={{ left: `calc(${currentPercent}% - 2px)` }}
              onMouseDown={(e) => handleTimelineMouseDown(e, 'playhead')}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full" />
            </div>

            {/* Time markers */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1 text-[10px] text-gray-500 pointer-events-none">
              <span>0:00</span>
              <span>{formatTime(duration / 4)}</span>
              <span>{formatTime(duration / 2)}</span>
              <span>{formatTime((duration * 3) / 4)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Segment Info and Quick Actions */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Start:</span>
                <span className="font-mono tabular-nums bg-gray-100 px-2 py-0.5 rounded">
                  {formatTime(startTime)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={setCurrentAsStart}
                  className="h-6 px-2 text-xs"
                  title="Set current position as start"
                >
                  <Scissors className="h-3 w-3 mr-1" />
                  Set
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">End:</span>
                <span className="font-mono tabular-nums bg-gray-100 px-2 py-0.5 rounded">
                  {formatTime(endTime)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={setCurrentAsEnd}
                  className="h-6 px-2 text-xs"
                  title="Set current position as end"
                >
                  <Scissors className="h-3 w-3 mr-1" />
                  Set
                </Button>
              </div>
            </div>
            <div className="text-gray-500">
              Duration: <span className="font-mono">{formatTime(endTime - startTime)}</span>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Drag the blue handles to select the portion of the video to analyze.
            The SOP will only be generated from frames within this segment.
          </p>
        </div>
      )}
    </div>
  );
}
