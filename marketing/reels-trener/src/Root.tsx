import { Composition } from 'remotion';
import { DURATION_S, FPS } from './timeline';
import { Reels } from './Reels';
import { Test3D } from './Test3D';
import { Reels3D } from './Reels3D';

export const Root = () => (
  <>
  <Composition id="Test3D" component={Test3D} width={1080} height={1920} fps={FPS} durationInFrames={60} />
  <Composition id="Reels3D" component={Reels3D} width={1080} height={1920} fps={FPS} durationInFrames={Math.round(DURATION_S * FPS)} />
  <Composition
    id="Reels"
    component={Reels}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={Math.round(DURATION_S * FPS)}
  />
  </>
);
