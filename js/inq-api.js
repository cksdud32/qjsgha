window.postTicketingPracticeResult = async function(name, stopwatch) {
  const response = await fetch('/api/ticketing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'create', name, stopwatch }),
  });
  return response.json();
};

window.updateTicketingPracticeResult = async function(id, stopwatch) {
  const response = await fetch('/api/ticketing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update', id, stopwatch }),
  });
  return response.json();
};

window.getTicketingPracticeRecords = async function() {
  const response = await fetch('/api/ticketing?type=records');
  return response.json();
};

window.getTicketingLeaderboard = async function(myStopwatch) {
  const url = myStopwatch
    ? `/api/ticketing?type=leaderboard&myStopwatch=${myStopwatch}`
    : '/api/ticketing?type=leaderboard';
  const response = await fetch(url);
  return response.json();
};
