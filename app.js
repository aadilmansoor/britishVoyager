const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt'); // For password hashing
const path = require('path');
const mongoose = require('mongoose');
const { connectDB, User, Product } = require('./db'); // Import the connectDB function
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const paypal = require('paypal-rest-sdk');
const nodemailer = require('nodemailer');
dotenv.config(); // Load environment variables from .env file

const app = express();
const PORT = process.env.PORT || 3000;
const saltRounds = 10; // Salt rounds for bcrypt

// Call the connectDB function to establish the MongoDB connection
connectDB();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const transporter = nodemailer.createTransport({
  service: 'Gmail', // e.g., 'Gmail'
  auth: {
    user: 'britishvoyager@gmail.com',
    pass: process.env.GMAIL_PASSWORD,
  },
});

paypal.configure({
  mode: process.env.PAYPAL_MODE, // 'sandbox' or 'live'
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_SECRET_KEY,
});

// Secret key for JWT (replace this with your own secret key)
const secretKey = process.env.SECRET_KEY;

// Function to generate a JWT token
function generateToken(payload) {
  return jwt.sign(payload, secretKey, { expiresIn: '1h' });
}

function capitalizeFirstLetter(word) {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

// Middleware to authenticate requests using JWT
function authenticateToken(req, res, next) {
  const token = req.headers.authorization;

  if (!token || !token.startsWith('Bearer ')) {
    return res.sendStatus(401);
  }

  const authToken = token.split(' ')[1];

  jwt.verify(authToken, secretKey, (err, user) => {
    if (err) {
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
}

// Function to get product details for a single item in the cart
async function getProductDetails(productId) {
  try {
    // Query the products collection to get product details by product ID
    const product = await Product.findById(productId);

    return product;
  } catch (error) {
    console.error('Error fetching product details:', error);
    throw error;
  }
}

// Function to get product details for items in the user's cart
async function getCartDetails(cart) {
  const cartDetails = [];

  for (const cartItem of cart) {
    const productDetails = await getProductDetails(cartItem.product);
    if (productDetails) {
      cartDetails.push({
        product: productDetails,
        quantity: cartItem.quantity,
        size: cartItem.size,
        color: cartItem.color
      });
    }
  }

  return cartDetails;
}


//redirect to login or dashboard
app.get('/', (req, res) => {
  res.redirect('home');
});

// Render the login page
app.get('/login', (req, res) => {
  res.render('login');
});

// Handle login form submission
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const lowercaseEmail = email.toLowerCase();


  try {
    // Find the user by email in the database
    const user = await User.findOne({ email: lowercaseEmail });

    // If the user is not found, show an error message
    if (!user) {
      return res.status(401).send('Invalid email or password');
    }

    // Compare the provided password with the hashed password in the database
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      // If the passwords don't match, show an error message
      return res.status(401).send('Invalid email or password');
    }

    // Authentication successful; generate a JWT token and send it in the response
    const token = generateToken({ email: user.email });

    // Send the token in the response
    res.json({ token }); // Send the token back to the client
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Render the registration page
app.get('/register', (req, res) => {
  res.render('register');
});

// Handle registration form submission
app.post('/register', async (req, res) => {
  const { email, password, } = req.body;

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = await User.findOne({ email });
    if (user) {
      return res.status(409).send('Email is already registered.');
    }

    // Save the user to the database
    await User.create({ email, password: hashedPassword });
    res.status(200).send('Registered Successfully')


  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Render the dashboard page
app.get('/home', (req, res) => {
  res.render('home');
});

//Render the product page
app.get('/product/:id', async (req, res) => {
  const id = req.params.id;
  const color = req.query.color;
  const product = await Product.findOne({ id: parseInt(id) });
  res.render('product', { product, color });
});

app.get('/profile', (req, res) => {
  res.render('profile');
});

// Add a product to the user's cart
app.post('/add-to-cart', async (req, res) => {
  const { productId, size, token, color } = req.body; // Assuming you're sending the product ID in the request body 
  const decodedToken = jwt.verify(token, secretKey);


  try {
    // Find the user by their email
    const user = await User.findOne({ email: decodedToken.email });

    // Find the product by its ID
    const product = await Product.findOne({ id: productId });

    if (!user || !product) {
      return res.status(404).send('User or product not found');
    }

    // Check if the product and size combination is already in the user's cart
    const existingCartItem = user.cart.find(
      (item) => String(item.product) === String(product._id) && item.size === size && item.color === capitalizeFirstLetter(color)
    );

    if (existingCartItem) {
      // If the product and size combination already exists, update the quantity
      existingCartItem.quantity += 1;
    } else {
      // If not, add the product to the user's cart
      user.cart.push({
        product: product._id, // Store the product's ObjectId
        quantity: 1,
        size,
        color: capitalizeFirstLetter(color)
      });
    }

    // Save the updated user document
    await user.save();

    res.status(200).send('Product added to cart successfully');
  } catch (error) {
    console.error('Error adding product to cart:', error);
    res.status(500).send('Internal Server Error');
  }
});


app.get('/get-cart', authenticateToken, async (req, res) => {
  const authHeader = req.headers.authorization;

  const token = authHeader.split(' ')[1]; // Get the token part after 'Bearer '
  const decodedToken = jwt.verify(token, secretKey);

  try {
    // Find the user by their email
    const user = await User.findOne({ email: decodedToken.email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get cart details with product information
    const cartDetails = await getCartDetails(user.cart);
    res.json({ cart: cartDetails });
  } catch (error) {
    console.error('Error fetching cart details:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Server-side route to retrieve cart data and generate cart HTML
app.get('/get-cart-html', authenticateToken, async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader.split(' ')[1]; // Get the token part after 'Bearer '
  const decodedToken = jwt.verify(token, secretKey);

  try {
    // Find the user by their email
    const user = await User.findOne({ email: decodedToken.email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get cart details with product information
    const cartDetails = await getCartDetails(user.cart);

    if (cartDetails.length === 0) {
      // Return a message indicating that the cart is empty
      return res.json({ message: 'Cart is empty' });
    }

    // Generate HTML for the cart items
    const cartItemHtml = cartDetails.map(item => `
      <tr>
        <td scope="row" colspan="4">${item.product.name} ${item.color} - ${item.size} × ${item.quantity}</td>
        <td colspan="1">${item.product.price}</td>
      </tr>
    `).join('');

    // Calculate the total price
    const total = cartDetails.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

    // Send the cart item HTML and total as a response
    res.json({ cartHtml: cartItemHtml, total });
  } catch (error) {
    console.error('Error fetching cart details:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


app.get('/checkout', async (req, res) => {
  res.render('checkout')
})

app.get('/checkout/:id', async (req, res) => {
  const id = req.params.id;
  const product = await Product.findOne({ id: parseInt(id) });
  productName = product.name;
  productPrice = product.price;
  res.render('checkout2', { productName, productPrice })
})

// Handle the form submission for adding an address
app.post('/add-address', authenticateToken, async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader.split(' ')[1]; // Get the token part after 'Bearer '
  const decodedToken = jwt.verify(token, secretKey);

  try {
    // Find the user by their email
    const user = await User.findOne({ email: decodedToken.email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Extract address data from the form submission
    const {
      first_name,
      last_name,
      country,
      street_address_1,
      street_address_2,
      town_city,
      phone_number,
      email,
    } = req.body;

    // Create an address object
    const address = {
      first_name,
      last_name,
      country,
      street_address_1,
      street_address_2,
      town_city,
      phone_number,
      email,
    };


    // Update the user's address in the database
    user.addresses.push(address);

    // Save the updated user document
    await user.save();

    res.status(200).send('Address added successfully');
  } catch (error) {
    console.error('Error adding address:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Define a route to get user's address
app.get('/get-user-address', authenticateToken, async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader.split(' ')[1]; // Get the token part after 'Bearer '
  const decodedToken = jwt.verify(token, secretKey);

  try {
    // Find the user by their email
    const user = await User.findOne({ email: decodedToken.email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the user has addresses
    if (user.addresses && user.addresses.length > 0) {
      // Send the user's addresses as a JSON response
      res.json({ addresses: user.addresses });
    } else {
      // Send a message indicating that there are no addresses
      res.json({ message: 'User does not have any addresses' });
    }
  } catch (error) {
    console.error('Error fetching user address:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});



app.get('/success', async (req, res) => {
  res.render('success')
})

app.post('/create-payment', (req, res) => {
  const createPaymentJson = {
    intent: 'sale',
    payer: {
      payment_method: 'paypal',
    },
    redirect_urls: {
      return_url: 'http://localhost:3000/execute-payment',
      cancel_url: 'http://localhost:3000/cancel-payment',
    },
    transactions: [
      {
        amount: {
          total: '25',
          currency: 'RUB',
        },
        description: 'Payment description',
      },
    ],
  };

  paypal.payment.create(createPaymentJson, (error, payment) => {
    if (error) {
      console.error(error);
    } else {
      for (const link of payment.links) {
        if (link.rel === 'approval_url') {
          res.redirect(link.href);
        }
      }
    }
  });
});

app.get('/execute-payment', (req, res) => {
  const payerId = req.query.PayerID;
  const paymentId = req.query.paymentId;

  const executePaymentJson = {
    payer_id: payerId,
  };

  paypal.payment.execute(paymentId, executePaymentJson, (error, payment) => {
    if (error) {
      console.error(error);
    } else {
      // Payment successful, handle post-payment actions (e.g., order completion)
      res.render('success'); // Render success page
    }
  });
});

app.get('/cancel-payment', (req, res) => {
  // Handle canceled payment
  res.render('cancel'); // Render cancel page
});

app.post('/send-email', (req, res) => {
  const { recipientEmail, subject, message } = req.body;

  const mailOptions = {
    from: 'britishvoyager@gmail.com',
    to: recipientEmail,
    subject: subject,
    text: message,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ success: false, error: 'Email sending failed' });
    } else {
      console.log('Email sent:', info.response);
      res.status(200).json({ success: true, message: 'Email sent successfully' });
    }
  });
});

// Define a route for handling search requests
app.get('/search', async (req, res) => {
  const searchQuery = req.query.q;

  try {
    // Use a regular expression to perform a case-insensitive search
    const regex = new RegExp(searchQuery, 'i');

    // Query your MongoDB collection for products that match the search query
    const searchResults = await Product.find({ name: regex });

    const results = []

    if (searchResults.length === 0) {
      results.push('<p class="mt-5 text-center text-secondary">No results found</p>')
    } else {

      searchResults.forEach(result => {
        results.push(`
      <div role="button" class="search_result cursor-pointer" onclick="productDetails(${result.id})">
      <div class="image_details">
          <div class="product-image">
              <img src="/images/${result.id}/black/no_bg.png" alt="">
          </div>
          <div class="product-details">
              <span class="product_name">
                  ${result.name}
              </span>
              <svg class="my-1" xmlns="http://www.w3.org/2000/svg" width="61" height="10" viewBox="0 0 61 10"
                  fill="none">
                  <path
                      d="M1.83416 8.79894C1.8771 8.24812 1.91953 7.70612 1.9617 7.16423C1.9833 6.886 2.00489 6.60765 2.02585 6.3293C2.04183 6.11713 1.96822 5.93375 1.81933 5.77189C1.26507 5.16912 0.711064 4.56622 0.161402 3.95991C0.0968642 3.8888 0.038588 3.80146 0.0143063 3.71307C-0.0499764 3.4788 0.106961 3.2805 0.392846 3.21479C0.787232 3.12416 1.18238 3.03624 1.57703 2.94667C2.02982 2.84393 2.48235 2.74061 2.93514 2.63799C3.16313 2.58627 3.33809 2.46943 3.46218 2.28523C3.89516 1.64284 4.32968 1.00128 4.76368 0.359355C4.7932 0.315745 4.8217 0.271545 4.85263 0.228758C5.07295 -0.075569 5.4497 -0.077917 5.66338 0.2317C6.01176 0.736679 6.35171 1.24648 6.69523 1.75439C6.81536 1.93201 6.93549 2.1095 7.05511 2.28735C7.18125 2.47495 7.36182 2.58827 7.59506 2.64069C8.43137 2.82853 9.26717 3.01849 10.1022 3.21126C10.5302 3.31012 10.6457 3.64324 10.3615 3.95521C9.81786 4.55176 9.27382 5.14808 8.72454 5.74016C8.55444 5.92341 8.47073 6.12394 8.49054 6.3655C8.55444 7.14518 8.61182 7.92534 8.67649 8.70503C8.70179 9.01041 8.55329 9.22434 8.27086 9.23774C8.16453 9.2428 8.04977 9.21071 7.94855 9.17333C7.16054 8.88299 6.37497 8.58713 5.58862 8.29314C5.36753 8.21051 5.14771 8.2111 4.9256 8.29444C4.13964 8.58948 3.3533 8.88369 2.56542 9.17439C2.47098 9.20918 2.36606 9.2381 2.26599 9.2381C2.00592 9.23798 1.83058 9.04744 1.83416 8.79894Z"
                      fill="#ED1C24" />
                  <path
                      d="M14.4543 8.79894C14.4972 8.24812 14.5396 7.70612 14.5818 7.16423C14.6034 6.886 14.625 6.60765 14.646 6.3293C14.6619 6.11713 14.5883 5.93375 14.4394 5.77189C13.8852 5.16912 13.3312 4.56622 12.7815 3.95991C12.717 3.8888 12.6587 3.80146 12.6344 3.71307C12.5701 3.4788 12.7271 3.2805 13.013 3.21479C13.4073 3.12416 13.8025 3.03624 14.1971 2.94667C14.6499 2.84393 15.1025 2.74061 15.5553 2.63799C15.7833 2.58627 15.9582 2.46943 16.0823 2.28523C16.5153 1.64284 16.9498 1.00128 17.3838 0.359355C17.4133 0.315745 17.4418 0.271545 17.4727 0.228758C17.6931 -0.075569 18.0698 -0.077917 18.2835 0.2317C18.6319 0.736679 18.9718 1.24648 19.3153 1.75439C19.4355 1.93201 19.5556 2.1095 19.6752 2.28735C19.8014 2.47495 19.9819 2.58827 20.2152 2.64069C21.0515 2.82853 21.8873 3.01849 22.7223 3.21126C23.1503 3.31012 23.2659 3.64324 22.9816 3.95521C22.438 4.55176 21.8939 5.14808 21.3447 5.74016C21.1746 5.92341 21.0909 6.12394 21.1107 6.3655C21.1746 7.14518 21.2319 7.92534 21.2966 8.70503C21.3219 9.01041 21.1734 9.22434 20.891 9.23774C20.7846 9.2428 20.6699 9.21071 20.5687 9.17333C19.7807 8.88299 18.9951 8.58713 18.2087 8.29314C17.9876 8.21051 17.7678 8.2111 17.5457 8.29444C16.7598 8.58948 15.9734 8.88369 15.1855 9.17439C15.0911 9.20918 14.9862 9.2381 14.8861 9.2381C14.626 9.23798 14.4507 9.04744 14.4543 8.79894Z"
                      fill="#ED1C24" />
                  <path
                      d="M27.0754 8.79894C27.1183 8.24812 27.1607 7.70612 27.2029 7.16423C27.2245 6.886 27.2461 6.60765 27.2671 6.3293C27.283 6.11713 27.2094 5.93375 27.0605 5.77189C26.5063 5.16912 25.9523 4.56622 25.4026 3.95991C25.3381 3.8888 25.2798 3.80146 25.2555 3.71307C25.1912 3.4788 25.3482 3.2805 25.6341 3.21479C26.0284 3.12416 26.4236 3.03624 26.8182 2.94667C27.271 2.84393 27.7236 2.74061 28.1764 2.63799C28.4043 2.58627 28.5793 2.46943 28.7034 2.28523C29.1364 1.64284 29.5709 1.00128 30.0049 0.359355C30.0344 0.315745 30.0629 0.271545 30.0938 0.228758C30.3142 -0.075569 30.6909 -0.077917 30.9046 0.2317C31.253 0.736679 31.5929 1.24648 31.9364 1.75439C32.0566 1.93201 32.1767 2.1095 32.2963 2.28735C32.4225 2.47495 32.603 2.58827 32.8363 2.64069C33.6726 2.82853 34.5084 3.01849 35.3434 3.21126C35.7714 3.31012 35.8869 3.64324 35.6027 3.95521C35.0591 4.55176 34.515 5.14808 33.9658 5.74016C33.7957 5.92341 33.7119 6.12394 33.7318 6.3655C33.7957 7.14518 33.853 7.92534 33.9177 8.70503C33.943 9.01041 33.7945 9.22434 33.5121 9.23774C33.4057 9.2428 33.291 9.21071 33.1898 9.17333C32.4018 8.88299 31.6162 8.58713 30.8298 8.29314C30.6087 8.21051 30.3889 8.2111 30.1668 8.29444C29.3809 8.58948 28.5945 8.88369 27.8066 9.17439C27.7122 9.20918 27.6073 9.2381 27.5072 9.2381C27.2471 9.23798 27.0718 9.04744 27.0754 8.79894Z"
                      fill="#ED1C24" />
                  <path
                      d="M39.6965 8.79894C39.7394 8.24812 39.7818 7.70612 39.824 7.16423C39.8456 6.886 39.8672 6.60765 39.8882 6.3293C39.9041 6.11713 39.8305 5.93375 39.6816 5.77189C39.1274 5.16912 38.5734 4.56622 38.0237 3.95991C37.9592 3.8888 37.9009 3.80146 37.8766 3.71307C37.8123 3.4788 37.9693 3.2805 38.2552 3.21479C38.6495 3.12416 39.0447 3.03624 39.4393 2.94667C39.8921 2.84393 40.3447 2.74061 40.7974 2.63799C41.0254 2.58627 41.2004 2.46943 41.3245 2.28523C41.7575 1.64284 42.192 1.00128 42.626 0.359355C42.6555 0.315745 42.684 0.271545 42.7149 0.228758C42.9353 -0.075569 43.312 -0.077917 43.5257 0.2317C43.8741 0.736679 44.214 1.24648 44.5575 1.75439C44.6777 1.93201 44.7978 2.1095 44.9174 2.28735C45.0436 2.47495 45.2241 2.58827 45.4574 2.64069C46.2937 2.82853 47.1295 3.01849 47.9645 3.21126C48.3925 3.31012 48.508 3.64324 48.2238 3.95521C47.6802 4.55176 47.1361 5.14808 46.5868 5.74016C46.4167 5.92341 46.333 6.12394 46.3528 6.3655C46.4167 7.14518 46.4741 7.92534 46.5388 8.70503C46.5641 9.01041 46.4156 9.22434 46.1332 9.23774C46.0268 9.2428 45.9121 9.21071 45.8109 9.17333C45.0228 8.88299 44.2373 8.58713 43.4509 8.29314C43.2298 8.21051 43.01 8.2111 42.7879 8.29444C42.0019 8.58948 41.2156 8.88369 40.4277 9.17439C40.3333 9.20918 40.2284 9.2381 40.1283 9.2381C39.8682 9.23798 39.6929 9.04744 39.6965 8.79894Z"
                      fill="#ED1C24" />
                  <path
                      d="M52.3176 8.79894C52.3605 8.24812 52.4029 7.70612 52.4451 7.16423C52.4667 6.886 52.4883 6.60765 52.5093 6.3293C52.5252 6.11713 52.4516 5.93375 52.3027 5.77189C51.7485 5.16912 51.1945 4.56622 50.6448 3.95991C50.5803 3.8888 50.522 3.80146 50.4977 3.71307C50.4334 3.4788 50.5904 3.2805 50.8762 3.21479C51.2706 3.12416 51.6658 3.03624 52.0604 2.94667C52.5132 2.84393 52.9658 2.74061 53.4185 2.63799C53.6465 2.58627 53.8215 2.46943 53.9456 2.28523C54.3786 1.64284 54.8131 1.00128 55.2471 0.359355C55.2766 0.315745 55.3051 0.271545 55.336 0.228758C55.5564 -0.075569 55.9331 -0.077917 56.1468 0.2317C56.4952 0.736679 56.8351 1.24648 57.1786 1.75439C57.2988 1.93201 57.4189 2.1095 57.5385 2.28735C57.6646 2.47495 57.8452 2.58827 58.0785 2.64069C58.9148 2.82853 59.7506 3.01849 60.5856 3.21126C61.0136 3.31012 61.1291 3.64324 60.8449 3.95521C60.3013 4.55176 59.7572 5.14808 59.2079 5.74016C59.0378 5.92341 58.9541 6.12394 58.9739 6.3655C59.0378 7.14518 59.0952 7.92534 59.1599 8.70503C59.1852 9.01041 59.0367 9.22434 58.7543 9.23774C58.6479 9.2428 58.5332 9.21071 58.4319 9.17333C57.6439 8.88299 56.8584 8.58713 56.072 8.29314C55.8509 8.21051 55.6311 8.2111 55.409 8.29444C54.623 8.58948 53.8367 8.88369 53.0488 9.17439C52.9544 9.20918 52.8495 9.2381 52.7494 9.2381C52.4893 9.23798 52.314 9.04744 52.3176 8.79894Z"
                      fill="#ED1C24" />
              </svg>
              <span class="size">
                  Small
              </span>
          </div>
      </div>
      <span class="price">
          KD ${result.price}
      </span>
  </div>
  <hr class="search_line my-3">
      `)
      })
    }

    res.json(results);
  } catch (error) {
    console.error('Error searching for products:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/clear-cart', async (req, res) => {
  try {
    const token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({ message: 'Authorization token not provided' });
    }

    // Verify and decode the token to get the user's email
    const decodedToken = jwt.verify(token, secretKey);
    const userEmail = decodedToken.email;

    // Find the user by email
    const user = await User.findOne({ email: userEmail });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Clear the user's cart by setting it to an empty array
    user.cart = [];
    user.orders += 1

    // Save the updated user object
    await user.save();

    return res.json({ message: 'Cart cleared successfully', user });
  } catch (error) {
    console.error('Error clearing cart:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Define a route to update the quantity in MongoDB
app.put('/updateQuantity/:productId', authenticateToken, bodyParser.json(), async (req, res) => {
  const authHeader = req.headers.authorization;

  const token = authHeader.split(' ')[1]; // Get the token part after 'Bearer '
  const decodedToken = jwt.verify(token, secretKey);

  const userEmail = decodedToken.email;
  const productId = req.params.productId;
  const newQuantity = parseInt(req.query.quantity, 10); // Get the new quantity from the query string

  try {
    // Update the cart quantity for the user
    const user = await User.findOne({ email: userEmail });
    const product = await Product.findOne({ id: productId });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const cartItem = user.cart.find(item => item.product.toString() === product._id.toString());


    if (!cartItem) {
      return res.status(404).json({ message: 'Product not found in user cart' });
    }

    cartItem.quantity = newQuantity;

    await user.save();

    res.json({ newQuantity: cartItem.quantity });
  } catch (error) {
    console.error('Error updating quantity:', error);
    res.status(500).json({ error: 'Error updating quantity' });
  }

});

// Define a route to delete a product from MongoDB
app.delete('/deleteProduct/:productId', authenticateToken, async (req, res) => {
  const authHeader = req.headers.authorization;
  const productId = req.params.productId;


  const token = authHeader.split(' ')[1]; // Get the token part after 'Bearer '
  const decodedToken = jwt.verify(token, secretKey);

  const userEmail = decodedToken.email;

  try {
    // Find the user by ID
    const user = await User.findOne({ email: userEmail });
    const product = await Product.findOne({ id: productId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find the index of the product in the user's cart
    const productIndex = user.cart.findIndex(item => item.product.toString() === product._id.toString(
    ));

    if (productIndex === -1) {
      return res.status(404).json({ error: 'Product not found in the cart' });
    }

    // Remove the product from the user's cart
    user.cart.splice(productIndex, 1);

    // Save the updated user data
    await user.save();

    res.sendStatus(204); // No content (successful removal)
  } catch (error) {
    console.error('Error removing product from cart:', error);
    res.status(500).json({ error: 'Error removing product from cart' });
  }
});

app.get('/get-orders', async (req, res) => {
  try {

    const authHeader = req.headers.authorization;
    const token = authHeader.split(' ')[1]; // Get the token part after 'Bearer '

    if (!token) {
      return res.status(401).json({ message: 'Authorization token not provided' });
    }

 
    const decodedToken = jwt.verify(token, secretKey);
    const userEmail = decodedToken.email;

    // Find the user by email
    const user = await User.findOne({ email: userEmail });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    orders = user.orders;

    if(orders === 0){
      res.json({ orders: "0 order" });
    } else if(orders === 1){
      res.json({ orders: "1 order" });
    } else {
      res.json({ orders: `${orders} orders` });

    }
  } catch (error) {
    console.error('Error accessing orders:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


