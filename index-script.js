// index-script.js - Home page logic

const SUPABASE_URL = "https://rbmeslzlbsolkxnvesqb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibWVzbHpsYnNvbGt4bnZlc3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwODcxMzYsImV4cCI6MjA2MDY2MzEzNn0.cu-Qw0WoEslfKXXCiMocWFg6Uf1sK_cQYcyP2mT0-Nw";

let supabaseClient;

// Initialize Supabase Client
if (typeof supabase === 'undefined') {
    console.error('Error: Supabase client library not loaded.');
} else {
    try {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized successfully.');

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeHomePage);
        } else {
            initializeHomePage();
        }
    } catch (error) {
        console.error('Error initializing Supabase:', error);
        supabaseClient = null;
    }
}

// DOM Elements
let totalStickersElement;
let homeStickerImageElement;
let homeClubNameElement;
let homeLoadingIndicator;
let homeErrorMessage;

// Initialize home page
async function initializeHomePage() {
    console.log('Initializing home page...');

    // Get DOM elements
    totalStickersElement = document.getElementById('total-stickers');
    homeStickerImageElement = document.getElementById('home-sticker-image');
    homeClubNameElement = document.getElementById('home-club-name');
    homeLoadingIndicator = document.getElementById('home-loading-indicator');
    homeErrorMessage = document.getElementById('home-error-message');

    // Load data
    await loadTotalStickersCount();
    await loadRandomSticker();
}

// Function: Load total stickers count
async function loadTotalStickersCount() {
    if (!supabaseClient || !totalStickersElement) return;

    try {
        const { count, error } = await supabaseClient
            .from('stickers')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;

        totalStickersElement.textContent = count || '0';
        console.log(`Total stickers: ${count}`);
    } catch (error) {
        console.error('Error loading total stickers count:', error);
        totalStickersElement.textContent = 'N/A';
    }
}

// Function: Load random sticker
async function loadRandomSticker() {
    if (!supabaseClient || !homeStickerImageElement || !homeClubNameElement) return;

    showHomeLoading();

    try {
        // Get total count of stickers
        const { count, error: countError } = await supabaseClient
            .from('stickers')
            .select('*', { count: 'exact', head: true });

        if (countError) throw countError;
        if (!count || count === 0) throw new Error('No stickers found');

        // Get random sticker
        const randomIndex = Math.floor(Math.random() * count);

        const { data: stickerData, error: stickerError } = await supabaseClient
            .from('stickers')
            .select(`image_url, clubs ( name )`)
            .order('id', { ascending: true })
            .range(randomIndex, randomIndex)
            .single();

        if (stickerError) throw stickerError;
        if (!stickerData || !stickerData.clubs) throw new Error('Incomplete sticker data');

        // Preload image
        const img = new Image();
        img.onload = () => {
            homeStickerImageElement.src = stickerData.image_url;
            homeClubNameElement.textContent = stickerData.clubs.name;
            hideHomeLoading();
        };
        img.onerror = () => {
            throw new Error('Failed to load image');
        };
        img.src = stickerData.image_url;

    } catch (error) {
        console.error('Error loading random sticker:', error);
        showHomeError('Failed to load sticker. Please refresh the page.');
        hideHomeLoading();
    }
}

// Helper: Show loading
function showHomeLoading() {
    if (homeLoadingIndicator) homeLoadingIndicator.style.display = 'block';
}

// Helper: Hide loading
function hideHomeLoading() {
    if (homeLoadingIndicator) homeLoadingIndicator.style.display = 'none';
}

// Helper: Show error
function showHomeError(message) {
    if (homeErrorMessage) {
        homeErrorMessage.textContent = message;
        homeErrorMessage.style.display = 'block';
    }
}

// Helper: Hide error
function hideHomeError() {
    if (homeErrorMessage) {
        homeErrorMessage.style.display = 'none';
        homeErrorMessage.textContent = '';
    }
}
