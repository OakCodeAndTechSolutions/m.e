'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useReducer,
  useState,
  type ReactNode,
} from 'react';
import {
  INITIAL_ROOM_PLAY,
  roomPlayReducer,
  type RoomPlayState,
  type RoomPlayAction,
} from './room-play';

export type MobileKeys = {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  turnLeft: boolean;
  turnRight: boolean;
  inspect: boolean;
  stickX: number;
  stickY: number;
};

export type GameInputApi = {
  traceCircuit: string;
  setTraceCircuit: (id: string) => void;
  traceDetail: boolean;
  setTraceDetail: (value: boolean) => void;
  pointerHint: string | null;
  setPointerHint: (value: string | null) => void;
  setPointerHintsEnabled: (enabled: boolean) => void;
  play: RoomPlayState;
  dispatchRoom: React.Dispatch<RoomPlayAction>;
  mobileKeys: React.RefObject<MobileKeys>;
  stunUntil: React.RefObject<number>;
  setStunned: (ms: number) => void;
  isStunned: () => boolean;
  actionPrompt: string | null;
  setActionPrompt: (prompt: string | null) => void;
  nearBoard: boolean;
  setNearBoard: (value: boolean) => void;
};

const defaultKeys = (): MobileKeys => ({
  forward: false,
  back: false,
  left: false,
  right: false,
  turnLeft: false,
  turnRight: false,
  inspect: false,
  stickX: 0,
  stickY: 0,
});

type HudState = Pick<GameInputApi, 'pointerHint' | 'actionPrompt' | 'nearBoard'>;
type SceneInput = Omit<GameInputApi, keyof HudState>;
const GameInputContext = createContext<SceneInput | null>(null);
const GameHudContext = createContext<HudState | null>(null);

export function GameInputProvider({ children }: { children: ReactNode }) {
  const [traceCircuit, setTraceCircuit] = useState('');
  const [traceDetail, setTraceDetail] = useState(false);
  const [pointerHint, setPointerHintText] = useState<string | null>(null);
  const pointerHintsEnabled = useRef(true);
  const shownPointerHint = useRef<string | null>(null);
  const [play, dispatchRoom] = useReducer(roomPlayReducer, INITIAL_ROOM_PLAY);
  const mobileKeys = useRef<MobileKeys>(defaultKeys());
  const stunUntil = useRef(0);
  const [actionPrompt, setActionPrompt] = useState<string | null>(null);
  const [nearBoard, setNearBoard] = useState(false);

  const setStunned = useCallback((ms: number) => {
    stunUntil.current = performance.now() + ms;
  }, []);

  const isStunned = useCallback(() => performance.now() < stunUntil.current, []);

  const setPointerHint = useCallback((value: string | null) => {
    const next = pointerHintsEnabled.current ? value : null;
    if (shownPointerHint.current === next) return;
    shownPointerHint.current = next;
    setPointerHintText(next);
  }, []);

  const setPointerHintsEnabled = useCallback(
    (enabled: boolean) => {
      pointerHintsEnabled.current = enabled;
      if (!enabled) setPointerHint(null);
    },
    [setPointerHint]
  );

  const value = useMemo(
    () => ({
      traceCircuit,
      setTraceCircuit,
      traceDetail,
      setTraceDetail,
      setPointerHint,
      setPointerHintsEnabled,
      play,
      dispatchRoom,
      mobileKeys,
      stunUntil,
      setStunned,
      isStunned,
      setActionPrompt,
      setNearBoard,
    }),
    [
      traceCircuit,
      traceDetail,
      play,
      setStunned,
      isStunned,
      setPointerHint,
      setPointerHintsEnabled,
    ]
  );

  const hud = useMemo(
    () => ({ pointerHint, actionPrompt, nearBoard }),
    [pointerHint, actionPrompt, nearBoard]
  );
  return (
    <GameInputContext.Provider value={value}>
      <GameHudContext.Provider value={hud}>{children}</GameHudContext.Provider>
    </GameInputContext.Provider>
  );
}

export function useGameInput() {
  const ctx = useContext(GameInputContext);
  if (!ctx) throw new Error('useGameInput must be used inside GameInputProvider');
  return ctx;
}

/** Only the DOM HUD subscribes to transient hints; meshes keep their scene state. */
export function useGameHud() {
  const ctx = useContext(GameHudContext);
  if (!ctx) throw new Error('useGameHud must be used inside GameInputProvider');
  return ctx;
}
