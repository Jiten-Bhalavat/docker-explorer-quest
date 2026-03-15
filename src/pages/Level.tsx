import { useParams, Navigate } from 'react-router-dom';
import { levels } from '@/data/levelData';
import LevelPlayer from '@/components/game/LevelPlayer';
import AchievementPopup from '@/components/game/AchievementPopup';
import Level1Interactive from './Level1Interactive';
import Level2Interactive from './Level2Interactive';
import Level3Interactive from './Level3Interactive';
import Level4Interactive from './Level4Interactive';
import Level5Interactive from './Level5Interactive';
import Level6Interactive from './Level6Interactive';
import Level7Interactive from './Level7Interactive';
import Level8Interactive from './Level8Interactive';
import Level9Interactive from './Level9Interactive';
import Level10Interactive from './Level10Interactive';
import Level11Interactive from './Level11Interactive';
import Level12Interactive from './Level12Interactive';
import Level13Interactive from './Level13Interactive';
import Level14Interactive from './Level14Interactive';
import Level15Interactive from './Level15Interactive';

const Level = () => {
  const { id } = useParams<{ id: string }>();
  const levelId = Number(id);
  const level = levels.find(l => l.id === levelId);
  if (!level) return <Navigate to="/" />;


  if (levelId === 1) {
    return (
      <>
        <Level1Interactive />
        <AchievementPopup />
      </>
    );
  }

  if (levelId === 2) {
    return (
      <>
        <Level2Interactive />
        <AchievementPopup />
      </>
    );
  }

  if (levelId === 3) {
    return (
      <>
        <Level3Interactive />
        <AchievementPopup />
      </>
    );
  }

  if (levelId === 4) {
    return (
      <>
        <Level4Interactive />
        <AchievementPopup />
      </>
    );
  }

  if (levelId === 5) {
    return (
      <>
        <Level5Interactive />
        <AchievementPopup />
      </>
    );
  }

  if (levelId === 6) {
    return (
      <>
        <Level6Interactive />
        <AchievementPopup />
      </>
    );
  }

  if (levelId === 7) {
    return (
      <>
        <Level7Interactive />
        <AchievementPopup />
      </>
    );
  }

  if (levelId === 8) {
    return (
      <>
        <Level8Interactive />
        <AchievementPopup />
      </>
    );
  }

  if (levelId === 9) {
    return (
      <>
        <Level9Interactive />
        <AchievementPopup />
      </>
    );
  }

  if (levelId === 10) {
    return (
      <>
        <Level10Interactive />
        <AchievementPopup />
      </>
    );
  }

  if (levelId === 11) {
    return (
      <>
        <Level11Interactive />
        <AchievementPopup />
      </>
    );
  }

  if (levelId === 12) {
    return (
      <>
        <Level12Interactive />
        <AchievementPopup />
      </>
    );
  }

  if (levelId === 13) {
    return (
      <>
        <Level13Interactive />
        <AchievementPopup />
      </>
    );
  }

  if (levelId === 14) {
    return (
      <>
        <Level14Interactive />
        <AchievementPopup />
      </>
    );
  }

  if (levelId === 15) {
    return (
      <>
        <Level15Interactive />
        <AchievementPopup />
      </>
    );
  }

  return (
    <>
      <LevelPlayer key={levelId} levelId={levelId} />
      <AchievementPopup />
    </>
  );
};

export default Level;
