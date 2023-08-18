

document.addEventListener('DOMContentLoaded', function () {
    const cartButton = document.querySelector(".nav_end .fa-cart-shopping");
    const cart = document.getElementById("cart");

    const token = getCookie('token'); // Get the token from the cookie
    if (!token) {
        // If the token is not present
        cart.innerHTML = `<svg class="close" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M1 1L14 14M1 14L14 1" stroke="#6C6C6C" stroke-width="2" />
        </svg>
        <button class="login">Log In</button>`
        const login = document.querySelector(".cart .login");
        login.addEventListener('click', () => {
            window.location.href = 'login'
        })


    }





    cartButton.addEventListener('click', () => {
        const buttonRect = cartButton.getBoundingClientRect();
        cart.style.right = window.innerWidth - buttonRect.right + 'px';
        cart.style.top = buttonRect.bottom + 'px';
        cart.style.display = 'block';
    });


    // Event delegation for the close button
    document.addEventListener('click', function (event) {
        const closeButton = event.target.closest('.cart svg');
        if (closeButton) {
            console.log("Close button clicked");
            cart.style.display = 'none';
        }
    });

    document.addEventListener('click', function (event) {
        const target = event.target;
        if (!cart.contains(target) && !cartButton.contains(target)) {
            cart.style.display = 'none';
        }
    });

});