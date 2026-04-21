require('dotenv').config();

fetch('http://localhost:4000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Test User',
    email: 'swayamforme@gmail.com',
    password: 'test123'
  })
})
.then(res => res.json())
.then(data => console.log('Response:', JSON.stringify(data, null, 2)))
.catch(err => console.error('Error:', err.message));