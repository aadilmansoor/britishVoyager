const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config(); // Load environment variables from .env file

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1); // Exit the application with a failure status
  }
};

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  cart: {
    type: [{
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        default: 1,
      },
      size: {
        type: String,
        required: true,
      },
      color: {
        type: String,
        required: true,
      },
    }],
    default: [],
  },
  addresses: {
    type: [{
      first_name: {
        type: String,
        required: true,
      },
      last_name: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        required: true,
      },
      street_address_1: {
        type: String,
        required: true,
      },
      street_address_2: String,
      town_city: {
        type: String,
        required: true,
      },
      phone_number: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
    }],
    default: [],
  },
  orders: {
    type: Number,
    default: 0
  }
});

const productSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  colors: [{
    type: String,
    required: true,
  }],
  sizes: [{
    type: String,
    required: true,
  }],
  desc: {
    type: String
  },
});

const Product = mongoose.model('Product', productSchema);

const User = mongoose.model('User', userSchema);






module.exports = {
  connectDB,
  User,
  Product
};
