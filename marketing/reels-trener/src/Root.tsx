import { Composition } from 'remotion';
import { DURATION_S, FPS } from './timeline';
import { Reels } from './Reels';

export const Root = () => (
  <Composition
    id="Reels"
    component={Reels}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={Math.round(DURATION_S * FPS)}
  />
);
