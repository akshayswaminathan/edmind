import { useState, useEffect } from 'react';
import { applyRemoteOverrides } from './data/mdmFeatures';
import { fetchSharedLibrary } from './api/claude';
import { HomeScreen } from './screens/HomeScreen';
import { ComplaintScreen } from './screens/ComplaintScreen';
import { ResultScreen } from './screens/ResultScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { CaseSimScreen } from './screens/CaseSimScreen';
import { MdmScreen } from './screens/MdmScreen';
import { AdminScreen } from './screens/AdminScreen';
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
  const [adminReturn, setAdminReturn] = useState('home');

  // Load the shared finding library once, so every screen sees published edits.
  useEffect(() => {
    let cancelled = false;
    fetchSharedLibrary().then(({ overrides }) => {
      if (!cancelled && overrides) applyRemoteOverrides(overrides);
    });
    return () => { cancelled = true; };
  }, []);

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

  function handleStartMdm() {
    setScreen('mdm');
  }

  function handleStartAdmin(from = 'home') {
    setAdminReturn(from);
    setScreen('admin');
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
          onStartMdm={handleStartMdm}
          onStartAdmin={() => handleStartAdmin('home')}
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
    case 'mdm':
      return <MdmScreen onExit={handleHome} onAdmin={() => handleStartAdmin('mdm')} />;
    case 'admin':
      return <AdminScreen onExit={() => setScreen(adminReturn)} />;
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
