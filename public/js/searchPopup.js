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

    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

    searchInput.addEventListener('keyup', () => {
        const query = searchInput.value.trim();

        if (query.length === 0) {
            searchResults.innerHTML = ''; // Clear search results if the query is empty
            return;
        }

        // Send an AJAX request to the server to fetch search results
        fetch(`/search?q=${query}`)
            .then((response) => response.json())
            .then((data) => {
                {
                    displaySearchResults(data);
                }
            })
            .catch((error) => {
                console.error('Error fetching search results:', error);
            });
    });

    function displaySearchResults(results) {
        // Clear previous search results
        searchResults.innerHTML = '';

        // Display the new search results
        results.forEach((result) => {
            const productElement = document.createElement('div');
            productElement.innerHTML = result;
            searchResults.appendChild(productElement);
        });
    }

})