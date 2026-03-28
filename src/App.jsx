import { useState } from 'react';
import { HomeScreen } from './screens/HomeScreen';
import { ComplaintScreen } from './screens/ComplaintScreen';
import { ResultScreen } from './screens/ResultScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { CaseSimScreen } from './screens/CaseSimScreen';
import { complaints, COMPLAINT_SLUGS } from './data/complaints';

const SUMMARY_AFTER = 5;

function App() {
  const [screen, setScreen] = useState('home');
  const [settings, setSettings] = useState({
    timerSeconds: 120,
    mode: 'random',
  });
  const [session, setSession] = useState({
    drillsCompleted: 0,
    scores: [],
    missedDiagnoses: {},
    redMissedCount: 0,
    yellowMissedCount: 0,
  });
  const [currentDrill, setCurrentDrill] = useState({
    complaintSlug: null,
    userList: [],
    result: null,
  });
  const [currentCaseId, setCurrentCaseId] = useState(null);

  function handleUpdateSettings(updates) {
    setSettings(prev => ({ ...prev, ...updates }));
  }

  function handleStartDrill(slug) {
    setCurrentDrill({ complaintSlug: slug, userList: [], result: null });
    setScreen('drill');
  }

  function handleSubmitDrill(userList) {
    setCurrentDrill(prev => ({ ...prev, userList }));
    setScreen('results');
  }

  function handleSessionUpdate(result) {
    setSession(prev => {
      const newSession = {
        ...prev,
        drillsCompleted: prev.drillsCompleted + 1,
        scores: [...prev.scores, result.score],
        missedDiagnoses: { ...prev.missedDiagnoses },
        redMissedCount: prev.redMissedCount + (result.redMissed?.length || 0),
        yellowMissedCount: prev.yellowMissedCount + (result.yellowMissed?.length || 0),
      };

      // Track missed red diagnoses
      if (result.redMissed) {
        for (const dx of result.redMissed) {
          newSession.missedDiagnoses[dx] = (newSession.missedDiagnoses[dx] || 0) + 1;
        }
      }

      return newSession;
    });
  }

  function handleNextDrill() {
    if (session.drillsCompleted > 0 && session.drillsCompleted % SUMMARY_AFTER === 0) {
      setScreen('summary');
      return;
    }
    const slug = COMPLAINT_SLUGS[Math.floor(Math.random() * COMPLAINT_SLUGS.length)];
    handleStartDrill(slug);
  }

  function handleRetry() {
    handleStartDrill(currentDrill.complaintSlug);
  }

  function handleHome() {
    setScreen('home');
  }

  function handleStartCase(caseId) {
    setCurrentCaseId(caseId);
    setScreen('caseSim');
  }

  function handleDrillAgain() {
    const slug = COMPLAINT_SLUGS[Math.floor(Math.random() * COMPLAINT_SLUGS.length)];
    handleStartDrill(slug);
  }

  switch (screen) {
    case 'home':
      return (
        <HomeScreen
          settings={settings}
          session={session}
          onUpdateSettings={handleUpdateSettings}
          onStartDrill={handleStartDrill}
          onStartCase={handleStartCase}
        />
      );
    case 'drill':
      return (
        <ComplaintScreen
          complaintSlug={currentDrill.complaintSlug}
          timerSeconds={settings.timerSeconds}
          onSubmit={handleSubmitDrill}
          onExit={handleHome}
        />
      );
    case 'results':
      return (
        <ResultScreen
          complaintSlug={currentDrill.complaintSlug}
          userList={currentDrill.userList}
          onNextDrill={handleNextDrill}
          onRetry={handleRetry}
          onHome={handleHome}
          onSessionUpdate={handleSessionUpdate}
        />
      );
    case 'caseSim':
      return (
        <CaseSimScreen
          caseId={currentCaseId}
          onHome={handleHome}
        />
      );
    case 'summary':
      return (
        <SummaryScreen
          session={session}
          onDrillAgain={handleDrillAgain}
          onHome={handleHome}
        />
      );
    default:
      return <HomeScreen settings={settings} session={session} onUpdateSettings={handleUpdateSettings} onStartDrill={handleStartDrill} />;
  }
}

export default App;
