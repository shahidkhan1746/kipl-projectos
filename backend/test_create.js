const token = 'k9Xr2mQvT7pL4wZaB8nHfE3sYdU6jC1oR5tGiMxVePqWyNbKzA0lSuDhFgJ';
const jwt = require('jsonwebtoken');
const tokenStr = jwt.sign({ id: 'test', email: 'test', name: 'test' }, token);
fetch('http://localhost:3000/api/v1/meetings', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${tokenStr}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    projectId: 'test-project',
    title: 'Test Meeting',
    type: 'internal',
    date: '2026-08-13',
    attendees: [{name: 'Test', organisation: 'KIPL'}],
    agendaItems: [{item: 'Test item', discussion: 'Test discussion'}],
    actionItems: [{action: 'Test action', responsible: 'Test responsible'}]
  })
}).then(r => r.json()).then(console.log).catch(console.error);
