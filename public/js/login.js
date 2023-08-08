// Function to set a cookie
function setCookie(name, value, days) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = name + '=' + value + ';expires=' + expires.toUTCString() + ';path=/';
}

// Function to get a cookie
function getCookie(name) {
  const keyValue = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
  return keyValue ? keyValue[2] : null;
}

// Handle login form submission
document.querySelector('.login-btn').addEventListener('click', async (e) => {
  e.preventDefault();
  const email = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const response = await fetch('/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
  if (response.ok) {
    const data = await response.json();
    setCookie('token', data.token, 1); // Save the token in a cookie (1 day expiration)
    window.location.href = '/home';
  } else {
    const error = await response.text();
    alert(error);
  }
});

// Handle registration form submission
document.querySelector('.registration-btn').addEventListener('click', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email2').value;
  const password = document.getElementById('password2').value;
  const passwordConfirm = document.getElementById('password-confirm').value;

  const lowercaseEmail = email.toLowerCase();

  // Validate the email meets the criteria
  // Regular expression to validate email addresses
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!lowercaseEmail.match(emailRegex)) {
    alert('Invalid email');
    return;
  }

  // Validate the password meets the criteria
  const passwordRegex = /^[a-zA-Z0-9]{6,16}$/;
  if (!password.match(passwordRegex) || password !== passwordConfirm) {
    alert('Invalid password or password confirmation.');
    return;
  }

  const subscribeNewsletter = document.querySelector('input[name="subscription"]').checked;

  const response = await fetch('/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email: lowercaseEmail, password, subscribeNewsletter })
  });

  if (response.ok) {
    alert("Registration successfull");
    window.location.href = '/login';
  } else {
    const error = await response.text();
    alert(error);
  }
});



