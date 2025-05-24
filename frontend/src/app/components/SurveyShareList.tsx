import { useEffect, useState } from 'react';
import { useAuth } from '../../utils/AuthContext';
import { 
  respondToSurveyShare,
  fetchPendingShares 
} from '../../utils/surveyService';

interface SurveyShare {
  _id: string;
  surveyId: string;
  sharedBy: string;
  status: 'pending' | 'accepted' | 'rejected';
  sharedAt: string;
}

export const SurveyShareList = () => {
  const [shares, setShares] = useState<SurveyShare[]>([]);
  const { accessToken } = useAuth();

  useEffect(() => {
    const loadShares = async () => {
      try {
        if (!accessToken) return;
        const pendingShares = await fetchPendingShares(accessToken);
        setShares(pendingShares);
      } catch (error) {
        console.error('Error during share loading:', error);
      }
    };

    if (accessToken) {
      loadShares();
    }
  }, [accessToken]);

  const handleShareResponse = async (share: SurveyShare, accept: boolean) => {
    try {
      if (!accessToken) {
        throw new Error('Token non disponible');
      }
      
      await respondToSurveyShare(share._id, accept, accessToken);
      
      // Mettre à jour la liste des partages
      setShares(prevShares => 
        prevShares.filter(s => s._id !== share._id)
      );
    } catch (error) {
      console.error('Error during share response:', error);
    }
  };

  return (
    <div className="survey-share-list">
      <h2>Pending shares</h2>
      {shares.length === 0 ? (
        <p>No pending shares</p>
      ) : (
        <ul>
          {shares.map(share => (
            <li key={share._id}>
              <p>Shared by: {share.sharedBy}</p>
              <p>Date: {new Date(share.sharedAt).toLocaleDateString()}</p>
              <div className="actions">
                <button 
                  onClick={() => handleShareResponse(share, true)}
                  className="accept-btn"
                >
                  Accept
                </button>
                <button 
                  onClick={() => handleShareResponse(share, false)}
                  className="reject-btn"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};