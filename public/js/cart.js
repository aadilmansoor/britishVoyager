function decodeJwt(token) {
    const payloadBase64 = token.split('.')[1];
    const payloadDecoded = atob(payloadBase64);
    return JSON.parse(payloadDecoded);
}

document.addEventListener('DOMContentLoaded', function () {
    const cartButton = document.querySelector(".nav_end .fa-cart-shopping");
    const cart = document.getElementById("cart");

    const token = getCookie('token'); // Get the token from the cookie

    // Get the token from localStorage (or wherever you have stored it)

    if (token) {
        const decodedToken = decodeJwt(token);

        const expirationTimestamp = decodedToken.exp * 1000; // Convert to milliseconds
        const currentTimestamp = Date.now();

        if (currentTimestamp > expirationTimestamp) {
            // Token has expired, handle it (e.g., redirect to login)
            cart.style.height = "500px";
            cart.innerHTML = `<svg class="close" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M1 1L14 14M1 14L14 1" stroke="#6C6C6C" stroke-width="2" />
        </svg>
        <button class="login">Log In</button>`
            const login = document.querySelector(".cart .login");
            login.addEventListener('click', () => {
                window.location.href = '/login'
            })
            console.log('Token has expired');
        } else {
            // Token is still valid, continue with your application logic
            console.log('Token is still valid');
        }
    } else {
        // Token not found, handle it (e.g., redirect to login)
        // If the token is not present
        cart.style.height = "500px";
        cart.innerHTML = `<svg class="close" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M1 1L14 14M1 14L14 1" stroke="#6C6C6C" stroke-width="2" />
                </svg>
                <button class="login">Log In</button>`
        const login = document.querySelector(".cart .login");
        login.addEventListener('click', () => {
            window.location.href = '/login'
        })
        console.log('Token not found');
    }

    cartButton.addEventListener('click', () => {
        cart.style.display = 'block';
    });


    // Event delegation for the close button
    document.addEventListener('click', function (event) {
        const closeButton = event.target.closest('.cart svg');
        if (closeButton) {
            cart.style.display = 'none';
        }
    });

    document.addEventListener('click', function (event) {
        const target = event.target;
        if (!cart.contains(target) && !cartButton.contains(target)) {
            cart.style.display = 'none';
        }
    });

    getCart(token);

});

const checkout = () => {
    window.location.href = "/checkout"
}

function increase(button) {
    // Find the parent product container
    const token = getCookie('token')
    const productContainer = button.closest('.product');

    // Get the product ID and current quantity
    const productId = productContainer.getAttribute('data-productid');
    const quantityElement = productContainer.querySelector('.number');
    let currentQuantity = parseInt(quantityElement.textContent, 10);

    // Increase the quantity
    currentQuantity++;
    quantityElement.textContent = currentQuantity;

    // Make an asynchronous request to update the quantity in MongoDB
    fetch(`/updateQuantity/${productId}?quantity=${currentQuantity}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}` // Include your JWT token here
        },
    })
        .then(response => response.json())
        .then(data => {
            // Handle the response if needed
        })
        .catch(error => {
            console.error('Error updating quantity:', error);
        });
}

function decrease(button) {
    // Find the parent product container
    const token = getCookie('token')
    const productContainer = button.closest('.product');

    // Get the product ID and current quantity
    const productId = productContainer.getAttribute('data-productid');
    const quantityElement = productContainer.querySelector('.number');
    let currentQuantity = parseInt(quantityElement.textContent, 10);

    // Ensure the quantity doesn't go below 1
    if (currentQuantity > 1) {
        currentQuantity--;
        quantityElement.textContent = currentQuantity;

        // Make an asynchronous request to update the quantity in MongoDB
        fetch(`/updateQuantity/${productId}?quantity=${currentQuantity}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}` // Include your JWT token here
            },
        })
            .then(response => response.json())
            .then(data => {
                // Handle the response if needed
            })
            .catch(error => {
                console.error('Error updating quantity:', error);
            });
    }
}

// Event delegation for delete buttons
function remove(button) {
    const token = getCookie('token');
    // Find the parent product container
    const productContainer = button.closest('.product');

    // Get the product ID
    const productId = productContainer.getAttribute('data-productid');

    // Make an asynchronous request to delete the product from MongoDB
    fetch(`/deleteProduct/${productId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}` // Include your JWT token here
        },
    })
        .then(response => {
            if (response.ok) {
                // Remove the product container from the UI
                productContainer.remove();
            } else {
                console.error('Error deleting product:', response.statusText);
            }
        })
        .catch(error => {
            console.error('Error deleting product:', error);
        });
}



function getCart(token) {
    // Fetch cart data from the server
    fetch('/get-cart', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}` // Include your JWT token here
        },
    })
        .then(response => response.json())
        .then(data => {
            // Populate the cart items dynamically
            const cartItemsContainer = document.querySelector('.cart-products');
            cartItemsContainer.innerHTML = ""
            if (data.cart.length === 0) {
                // Cart is empty
                const emptyCartMessage = document.createElement('p');
                emptyCartMessage.textContent = 'Your cart is empty.';
                cartItemsContainer.appendChild(emptyCartMessage);
                cartItemsContainer.classList.add('container')
            } else {
                const no_of_items = document.getElementById('no_of_items');
                data.cart.forEach((item, index) => {
                    if (index === 0) {
                        no_of_items.innerHTML = "1 item";
                    } else {
                        no_of_items.innerHTML = `${index + 1} items`;
                    }
                    const cartItemDiv = document.createElement('div');
                    cartItemDiv.classList.add('product');
                    cartItemDiv.innerHTML = `
                        <div class="product" data-productid="${item.product.id}">
                            <div class="product-content">
                                <div class="product-image">
                                    <img src="/images/${item.product.id}/${item.color}/no_bg.png" alt="">
                                </div>
                                <div class="product-details">
                                    <span class="product-name">${item.product.name}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="61" height="10" viewBox="0 0 61 10" fill="none">
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
                                    <span class="product-size">${item.size}</span>
                                 </div>
                            </div>
                            <div class="price-quantity">
                                <p class="price">KD 45000/-</p>
                                <div class="quantity">
                                    <button class="no_style increase" onclick="decrease(this)"><span class="subtract">-</span></button><span class="number">${item.quantity}</span><button class="no_style decrease" onclick="increase(this)"><span class="add">+</span></button>
                                </div>
                                <div class="d-flex justify-content-center mt-2"><button class="no_style delete" onclick="remove(this)"><i class="fa-solid fa-trash"></i></button></div>
                            </div>
                        </div>
     `;
                    cartItemsContainer.appendChild(cartItemDiv);
                });
            }
        })
        .catch(error => {
            // Handle the error, e.g., display an error message
        });

}