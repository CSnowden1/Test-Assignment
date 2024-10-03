import axios from 'axios';
import * as process from 'process';
import * as dotenv from 'dotenv';
// Load environment variables from .env file
dotenv.config();
// Shopify API configurations using environment variables
const SHOPIFY_API_URL = process.env.SHOPIFY_API_URL || '';
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN || '';
const SHOPIFY_STOREFRONT_API_URL = process.env.SHOPIFY_STOREFRONT_API_URL || '';
const SHOPIFY_STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN || '';
// Function to fetch product IDs by name from Admin API
async function fetchProductIDsByName(productName) {
    const query = `
    {
      products(first: 10, query: "title:*${productName}*") {
        edges {
          node {
            id
            title
          }
        }
      }
    }`;
    try {
        const response = await axios.post(SHOPIFY_API_URL, { query }, {
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
            },
        });
        return response.data.data.products.edges;
    }
    catch (error) {
        console.error('Error fetching products by name:', error);
        return [];
    }
}
// Function to fetch variants by product ID from Storefront API
async function fetchVariantsByProductID(productID) {
    const query = `
    {
      product(id: "${productID}") {
        id
        title
        variants(first: 10) {
          edges {
            node {
              title
              price {
                amount
              }
            }
          }
        }
      }
    }`;
    try {
        const response = await axios.post(SHOPIFY_STOREFRONT_API_URL, { query }, {
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN,
            },
        });
        return response.data.data.product;
    }
    catch (error) {
        console.error('Error fetching product variants:', error);
        return null;
    }
}
// Function to sort and print variants by price
function displayProductVariants(products) {
    const variantsList = [];
    products.forEach((product) => {
        product.variants.edges.forEach((variant) => {
            variantsList.push({
                title: product.title,
                variant: variant.node.title,
                price: parseFloat(variant.node.price.amount),
            });
        });
    });
    // Sort variants by price
    variantsList.sort((a, b) => a.price - b.price);
    // Display sorted variants
    variantsList.forEach((variant) => {
        console.log(`${variant.title} - variant ${variant.variant} - price $${variant.price.toFixed(2)}`);
    });
}
// Main function to handle input and output
async function main() {
    // Get the product name from command line arguments
    const args = process.argv.slice(2);
    const productNameIndex = args.indexOf('--name');
    if (productNameIndex === -1 || !args[productNameIndex + 1]) {
        console.error('Please provide a product name using --name');
        return;
    }
    const productName = args[productNameIndex + 1];
    // Step 1: Fetch products by name using Admin API
    const productEdges = await fetchProductIDsByName(productName);
    if (productEdges.length === 0) {
        console.log(`No products found with the name: ${productName}`);
        return;
    }
    // Step 2: Fetch variants for each product using Storefront API
    const productsWithVariants = [];
    for (const edge of productEdges) {
        const productID = edge.node.id;
        const product = await fetchVariantsByProductID(productID);
        if (product) {
            productsWithVariants.push(product);
        }
    }
    // Step 3: Display sorted variants by price
    if (productsWithVariants.length > 0) {
        displayProductVariants(productsWithVariants);
    }
    else {
        console.log(`No variants found for products with the name: ${productName}`);
    }
}
// Run the main function
main();
