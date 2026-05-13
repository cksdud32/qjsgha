window.postTicketingPracticeResult = async function(name, stopwatch) {
  const response = await fetch('/api/post-ticketing-practice', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, stopwatch }),
  });
  return response.json();
};

window.updateTicketingPracticeResult = async function(id, stopwatch) {
  const response = await fetch('/api/update-ticketing-practice', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id, stopwatch }),
  });
  return response.json();
};

window.getTicketingPracticeRecords = async function() {
  const response = await fetch('/api/get-ticketing-practice');
  return response.json();
};

window.getTicketingLeaderboard = async function() {
  const response = await fetch('/api/get-ticketing-leaderboard');
  return response.json();
};
