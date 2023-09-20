const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt'); // For password hashing
const saltRounds = 10; // Salt rounds for bcrypt
const path = require('path');
const mongoose = require('mongoose');
const { connectDB, User, Product } = require('./db'); // Import the connectDB function
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const paypal = require('paypal-rest-sdk');

dotenv.config(); // Load environment variables from .env file

const app = express();
const PORT = process.env.PORT || 3000;

// Call the connectDB function to establish the MongoDB connection
connectDB();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

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
  const product = await Product.findOne({ id: parseInt(id) });
  res.render('product', { product });
});

app.get('/profile', (req, res) => {
  res.render('profile'); 
});

// Add a product to the user's cart
app.post('/add-to-cart', async (req, res) => {
  const { productId, size, token } = req.body; // Assuming you're sending the product ID in the request body 
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
      (item) => String(item.product) === String(product._id) && item.size === size
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
    const userF = user.cart[0].product;

    // Get cart details with product information
    const cartDetails = await getCartDetails(user.cart);

    if (cartDetails.length === 0) {
      // Return a message indicating that the cart is empty
      return res.json({ message: 'Cart is empty' });
    }

    // Generate HTML for the cart items
    const cartItemHtml = cartDetails.map(item => `
      <tr>
        <td scope="row" colspan="4">${item.product.name} - ${item.size} × ${item.quantity}</td>
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


app.get('/checkout', async (req,res) => {
  const productName = "";
  const productPrice = "";
  res.render('checkout', {productName, productPrice})
})

app.get('/checkout/:id', async (req,res) => {
  const id = req.params.id;
  const product = await Product.findOne({ id: parseInt(id) });
  productName = product.name;
  productPrice = product.price;
  console.log(productPrice);
  res.render('checkout', {productName, productPrice})
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


app.get('/success', async (req,res) => {
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


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


