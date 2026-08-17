import React from "react";
import { Composition, Still } from "remotion";
import { MainVideo } from "./MainVideo";
import { Poster } from "./Poster";
import { TesterVideo, TESTER_DURATION } from "./TesterVideo";
import { FeaturesVideo, FEATURES_DURATION } from "./FeaturesVideo";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="main"
      component={MainVideo}
      durationInFrames={750}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="tester"
      component={TesterVideo}
      durationInFrames={TESTER_DURATION}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="features"
      component={FeaturesVideo}
      durationInFrames={FEATURES_DURATION}
      fps={30}
      width={1080}
      height={1920}
    />
    <Still id="poster" component={Poster} width={1080} height={1920} />
  </>
);
