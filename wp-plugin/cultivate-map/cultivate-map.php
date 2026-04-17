<?php
/**
 * Plugin Name: Cultivate Map
 * Plugin URI: #
 * Description: Interactive map plugin for Cultivate Food Rescue showing poverty, food insecurity, partners, and accessibility data.
 * Version: 1.0.0
 * Author: Your Name
 * License: GPL v2 or later
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class CultivateMapPlugin {
    
    private $shortcode_used = false;
    
    public function __construct() {
        add_action('init', array($this, 'init'));
        add_action('wp_footer', array($this, 'conditional_enqueue_assets'));
        add_filter('the_content', array($this, 'detect_shortcode_usage'), 1);
        add_filter('widget_text', array($this, 'detect_shortcode_usage'), 1);
    }
    
    public function init() {
        add_shortcode('cultivate_map', array($this, 'render_map_shortcode'));
    }
    
    /**
     * Detect if our shortcode is being used on the current page
     */
    public function detect_shortcode_usage($content) {
        if (has_shortcode($content, 'cultivate_map')) {
            $this->shortcode_used = true;
        }
        return $content;
    }
    
    /**
     * Only enqueue assets if the shortcode is actually used on the page
     */
    public function conditional_enqueue_assets() {
        if ($this->shortcode_used) {
            $this->enqueue_assets();
        }
    }
    
    /**
     * Enqueue all CSS and JS dependencies
     */
    private function enqueue_assets() {
        // Enqueue CSS
        wp_enqueue_style(
            'cultivate-map-styles',
            plugin_dir_url(__FILE__) . 'assets/styles.css',
            array(),
            '1.0.0'
        );
        
        wp_enqueue_style(
            'leaflet-css',
            'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
            array(),
            '1.9.4'
        );
        
        wp_enqueue_style(
            'leaflet-markercluster-css',
            'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css',
            array('leaflet-css'),
            '1.5.3'
        );
        
        wp_enqueue_style(
            'leaflet-markercluster-default-css',
            'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css',
            array('leaflet-markercluster-css'),
            '1.5.3'
        );
        
        // Enqueue JavaScript
        wp_enqueue_script(
            'chartjs',
            'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
            array(),
            '4.4.1',
            true
        );
        
        wp_enqueue_script(
            'leaflet-js',
            'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
            array(),
            '1.9.4',
            true
        );
        
        wp_enqueue_script(
            'leaflet-markercluster-js',
            'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js',
            array('leaflet-js'),
            '1.5.3',
            true
        );
        
        wp_enqueue_script(
            'cultivate-map-app',
            plugin_dir_url(__FILE__) . 'assets/app.js',
            array('chartjs', 'leaflet-js', 'leaflet-markercluster-js'),
            '1.0.0',
            true
        );
        
        // Pass data to JavaScript if needed
        wp_localize_script('cultivate-map-app', 'cultivateMapAjax', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'plugin_url' => plugin_dir_url(__FILE__),
            'nonce' => wp_create_nonce('cultivate_map_nonce')
        ));
    }
    
    /**
     * Render the map shortcode
     */
    public function render_map_shortcode($atts) {
        $attributes = shortcode_atts(array(

        ), $atts);
        
        ob_start();
        ?>
        <div class="cultivate-map-container">
            <main>
                <section class="">
                    <div id="map"></div>

                    <!-- grouped controls -->
                    <div class="map-toolbar" role="toolbar" aria-label="Map overlays">
                        <div class="toolbar-group">
                            <div class="toolbar-label">Economic</div>
                            <div class="toolbar-buttons">
                                <button id="togglePoverty" type="button" class="pill">Show Poverty</button>
                                <button id="toggleClients" type="button" class="pill">Show Partners</button>
                                <button id="toggleFood" type="button" class="pill">Show Food Insecurity</button>
                            </div>
                        </div>

                        <div class="toolbar-group">
                            <div class="toolbar-label">Accessibility</div>
                            <div class="toolbar-buttons">
                                <button id="toggleRoutes" type="button" class="pill">Show Bus Routes</button>
                                <button id="toggleWalk" type="button" class="pill">Show Walking Coverage</button>
                            </div>
                        </div>

                        <div class="toolbar-group">
                            <div class="toolbar-label">Demographic</div>
                            <div class="toolbar-buttons">
                                <button id="toggleU18" type="button" class="pill">Show Under 18</button>
                                <button id="toggleIncome" type="button" class="pill">Show Income</button>
                                <button id="toggle65" type="button" class="pill">Show Over 65</button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
        <?php
        return ob_get_clean();
    }
}

// Initialize the plugin
new CultivateMapPlugin();

// Add activation hook
register_activation_hook(__FILE__, 'cultivate_map_activate');
function cultivate_map_activate() {
    // Plugin activation tasks (if any)
}

// Add deactivation hook
register_deactivation_hook(__FILE__, 'cultivate_map_deactivate');
function cultivate_map_deactivate() {
    // Plugin deactivation tasks (if any)
}