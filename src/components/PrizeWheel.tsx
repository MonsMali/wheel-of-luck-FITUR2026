'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Prize } from '@/types';
import { getWheelSegments } from '@/utils/prizeLogic';

interface PrizeWheelProps {
  onSpinComplete: (prize: Prize) => void;
  isSpinning: boolean;
  setIsSpinning: (spinning: boolean) => void;
  targetPrize: Prize | null;
  disabled: boolean;
}

const WHEEL_SIZE = 320;
const CENTER = WHEEL_SIZE / 2;
const RADIUS = WHEEL_SIZE / 2 - 10;

// Minimum full rotations before landing
const MIN_ROTATIONS = 4;
const MAX_ROTATIONS = 6;

export default function PrizeWheel({
  onSpinComplete,
  isSpinning,
  setIsSpinning,
  targetPrize,
  disabled,
}: PrizeWheelProps) {
  const [displayRotation, setDisplayRotation] = useState(0);
  const currentRotationRef = useRef(0);
  const spinTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasSpunRef = useRef(false);
  const segments = getWheelSegments();

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Only trigger once per spin
    if (isSpinning && targetPrize && !hasSpunRef.current) {
      hasSpunRef.current = true;

      // Find ALL segments that match the target prize type
      const matchingIndices = segments
        .map((s, i) => (s.prize.type === targetPrize.type ? i : -1))
        .filter(i => i !== -1);

      if (matchingIndices.length === 0) return;

      // Pick a random matching segment
      const targetIndex = matchingIndices[Math.floor(Math.random() * matchingIndices.length)];

      // Calculate the angle for this segment
      const segmentAngle = 360 / segments.length;
      const segmentStart = targetIndex * segmentAngle;

      // Random position within the segment (not too close to edges)
      const margin = segmentAngle * 0.15;
      const landingAngle = segmentStart + margin + Math.random() * (segmentAngle - 2 * margin);

      // Calculate full rotations (always positive, always clockwise)
      const fullRotations = MIN_ROTATIONS + Math.random() * (MAX_ROTATIONS - MIN_ROTATIONS);
      const baseSpins = Math.floor(fullRotations) * 360;

      // The pointer is at the top (0°). After CSS rotation R, segment at angle A
      // appears at visual angle (A + R) % 360. We want it at 0°.
      // So we need R where (landingAngle + R) % 360 = 0
      // Which means R % 360 = (360 - landingAngle) % 360
      const targetEffective = (360 - landingAngle + 360) % 360;
      const currentEffective = currentRotationRef.current % 360;

      // Calculate delta needed to go from current to target (always positive/clockwise)
      const deltaToTarget = (targetEffective - currentEffective + 360) % 360;

      // New rotation = current + full spins + delta to land on target
      const newRotation = currentRotationRef.current + baseSpins + deltaToTarget;
      currentRotationRef.current = newRotation;
      setDisplayRotation(newRotation);

      // Animation complete callback
      spinTimeoutRef.current = setTimeout(() => {
        setIsSpinning(false);
        onSpinComplete(targetPrize);
      }, 5000);
    }

    // Reset the spin guard when spinning stops
    if (!isSpinning) {
      hasSpunRef.current = false;
    }
  }, [isSpinning, targetPrize, segments, onSpinComplete, setIsSpinning]);

  // Create SVG path for a pie segment
  const createSegmentPath = (startAngle: number, endAngle: number): string => {
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);

    const x1 = CENTER + RADIUS * Math.cos(startRad);
    const y1 = CENTER + RADIUS * Math.sin(startRad);
    const x2 = CENTER + RADIUS * Math.cos(endRad);
    const y2 = CENTER + RADIUS * Math.sin(endRad);

    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${CENTER} ${CENTER} L ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  // Calculate text position for segment
  const getTextPosition = (startAngle: number, endAngle: number) => {
    const midAngle = ((startAngle + endAngle) / 2 - 90) * (Math.PI / 180);
    const textRadius = RADIUS * 0.65;
    return {
      x: CENTER + textRadius * Math.cos(midAngle),
      y: CENTER + textRadius * Math.sin(midAngle),
      rotation: (startAngle + endAngle) / 2,
    };
  };

  let currentAngle = 0;

  return (
    <div className="relative">
      {/* Wheel Container */}
      <div className="relative w-80 h-80 mx-auto">
        {/* Outer glow effect */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            boxShadow: '0 0 40px rgba(232, 93, 4, 0.4), 0 0 80px rgba(0, 119, 182, 0.3)',
          }}
        />

        {/* SVG Wheel */}
        <svg
          width={WHEEL_SIZE}
          height={WHEEL_SIZE}
          className="drop-shadow-2xl"
          style={{
            transform: `rotate(${displayRotation}deg)`,
            transition: isSpinning
              ? 'transform 5s cubic-bezier(0.15, 0.60, 0.20, 1.00)'
              : 'none',
          }}
        >
          {/* Wheel border */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS + 5}
            fill="none"
            stroke="#FFD700"
            strokeWidth="8"
          />

          <g>
            {segments.map((segment, index) => {
              const startAngle = currentAngle;
              const endAngle = currentAngle + segment.angle;
              const path = createSegmentPath(startAngle, endAngle);
              const textPos = getTextPosition(startAngle, endAngle);
              currentAngle = endAngle;

              return (
                <g key={index}>
                  {/* Segment */}
                  <path
                    d={path}
                    fill={segment.prize.color}
                    stroke="#fff"
                    strokeWidth="2"
                  />

                  {/* Icon only - text would be too small with 16 segments */}
                  <text
                    x={textPos.x}
                    y={textPos.y}
                    fontSize="18"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${textPos.rotation}, ${textPos.x}, ${textPos.y})`}
                    style={{ filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.5))' }}
                  >
                    {segment.prize.icon}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Center circle */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={30}
            fill="#FFD700"
            stroke="#fff"
            strokeWidth="3"
          />
          <text
            x={CENTER}
            y={CENTER}
            fill="#333"
            fontSize="10"
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            ALGARVE
          </text>
        </svg>

        {/* Pointer */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10"
          style={{
            width: 0,
            height: 0,
            borderLeft: '15px solid transparent',
            borderRight: '15px solid transparent',
            borderTop: '30px solid #FFD700',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
          }}
        />
      </div>
    </div>
  );
}
