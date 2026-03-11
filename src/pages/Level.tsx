import { useParams, Navigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';
import { levels } from '@/data/levelData';
import LevelPlayer from '@/components/game/LevelPlayer';
import AchievementPopup from '@/components/game/AchievementPopup';
import Level1Interactive from './Level1Interactive';

const Level = () => {
  const { id } = useParams<{ id: string }>();
  const levelId = Number(id);
  const { completedLevels } = useGameStore();

  const level = levels.find(l => l.id === levelId);
  if (!level) return <Navigate to="/" />;

  const isUnlocked = levelId === 1 || completedLevels.includes(levelId - 1);
  if (!isUnlocked) return <Navigate to="/" />;

  if (levelId === 1) {
    return (
      <>
        <Level1Interactive />
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
