document.addEventListener('DOMContentLoaded', function () {
    const searchPopup = document.querySelector('.search_popup');
    const searchButton = document.querySelector(".nav_end .fa-magnifying-glass");

    searchButton.addEventListener('click', () => {
        searchPopup.style.display = "block";
        const closeButton = document.querySelector('.search_box .close_btn');
        closeButton.addEventListener('click', () => {
            searchPopup.style.display = "none";
        })

        document.addEventListener('click', function (event) {
            const target = event.target;
            if (!searchPopup.contains(target) && !searchButton.contains(target)) {
                searchPopup.style.display = 'none';
            }
        });
    })
    
})