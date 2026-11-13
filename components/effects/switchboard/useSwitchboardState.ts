'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CIRCUITS, ROOM_CIRCUIT_IDS } from './circuit-data';

export type TripReason = 'test' | 'shock' | null;

function initialRcboState(): Record<string, boolean> {
  return Object.fromEntries(CIRCUITS.map((c) => [c.id, ROOM_CIRCUIT_IDS.has(c.id)]));
}

/** Board interaction state; separate from 3D composition. */
export function useSwitchboardState() {
  const [mainOn, setMainOn] = useState(true);
  const [rcboOn, setRcboOn] = useState<Record<string, boolean>>(initialRcboState);
  const [hovered, setHovered] = useState<string | null>(null);
  const [tripFlashId, setTripFlashId] = useState<string | null>(null);
  const [tripReason, setTripReason] = useState<TripReason>(null);
  const [coverOpen, setCoverOpen] = useState(false);
  const [escutcheonRemoved, setEscutcheonRemoved] = useState(false);
  const [coverPromptOpen, setCoverPromptOpen] = useState(false);
  const [shockActive, setShockActive] = useState(false);
  const [shockCircuitId, setShockCircuitId] = useState<string | null>(null);

  const toggleMain = useCallback(() => {
    setMainOn((v) => !v);
  }, []);

  const toggleRcbo = useCallback((id: string) => {
    setRcboOn((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  }, []);

  const tripRcbo = useCallback(
    (id: string, reason: TripReason = 'test') => {
      // A push-button test needs an energised, closed device.
      if (reason === 'test' && (!mainOn || !rcboOn[id])) return;
      setRcboOn((prev) => ({ ...prev, [id]: false }));
      setTripFlashId(id);
      setTripReason(reason);
    },
    [mainOn, rcboOn]
  );

  const requestCoverOpen = useCallback(() => {
    if (coverOpen) return;
    setCoverOpen(true);
  }, [coverOpen]);

  const confirmCoverOpen = useCallback(() => {
    setCoverOpen(true);
    setCoverPromptOpen(false);
  }, []);

  const denyCoverOpen = useCallback(() => {
    setCoverPromptOpen(false);
  }, []);

  const closeCover = useCallback(() => {
    setCoverOpen(false);
    setEscutcheonRemoved(false);
  }, []);

  const toggleEscutcheon = useCallback(() => {
    if (coverOpen) setEscutcheonRemoved((removed) => !removed);
  }, [coverOpen]);

  const shockOnWire = useCallback(
    (circuitId: string) => {
      if (shockActive) return;
      tripRcbo(circuitId, 'shock');
      setShockCircuitId(circuitId);
      setShockActive(true);
      window.dispatchEvent(new CustomEvent('switchboard-shock'));
    },
    [shockActive, tripRcbo]
  );

  const shockOnMains = useCallback(() => {
    if (shockActive) return;
    // An isolator is not an RCD. Incoming supply remains live with main OFF.
    setTripReason('shock');
    setShockCircuitId('main');
    setShockActive(true);
    window.dispatchEvent(new CustomEvent('switchboard-shock'));
  }, [shockActive]);

  useEffect(() => {
    if (!tripFlashId) return;
    const t = window.setTimeout(() => {
      setTripFlashId(null);
      if (tripReason === 'test') setTripReason(null);
    }, 420);
    return () => window.clearTimeout(t);
  }, [tripFlashId, tripReason]);

  useEffect(() => {
    if (!shockActive) return;
    const t = window.setTimeout(() => {
      setShockActive(false);
      setShockCircuitId(null);
      setTripReason(null);
    }, 2200);
    return () => window.clearTimeout(t);
  }, [shockActive]);

  const liveById = useMemo(
    () =>
      Object.fromEntries(CIRCUITS.map((c) => [c.id, mainOn && (rcboOn[c.id] ?? false)])) as Record<
        string,
        boolean
      >,
    [mainOn, rcboOn]
  );

  const flashCircuit = useMemo(
    () => CIRCUITS.find((c) => c.id === tripFlashId) ?? null,
    [tripFlashId]
  );

  return {
    mainOn,
    rcboOn,
    hovered,
    setHovered,
    tripFlashId,
    tripReason,
    coverOpen,
    escutcheonRemoved,
    toggleEscutcheon,
    coverPromptOpen,
    shockActive,
    shockCircuitId,
    toggleMain,
    toggleRcbo,
    tripRcbo,
    liveById,
    flashCircuit,
    requestCoverOpen,
    confirmCoverOpen,
    denyCoverOpen,
    closeCover,
    shockOnWire,
    shockOnMains,
  };
}
