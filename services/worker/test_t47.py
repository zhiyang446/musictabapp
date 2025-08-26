import sys
import os
import logging
import json
from pathlib import Path

# Add project root to Python path to allow module imports
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(project_root))

from services.worker.audio_preprocessor import test_t47_preprocessing

# --- Configuration ---
LOG_LEVEL = logging.INFO
TEST_AUDIO_FILE = Path(r"C:\Users\zhiya\Documents\MyProject\musictabapp\output\Rolling In The Deep - Adele DRUM COVER.mp3")
RESULTS_DIR = project_root / "temp"

# --- Setup Logging ---
logging.basicConfig(
    level=LOG_LEVEL,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


def run_test():
    """
    Main function to run the T47 test
    """
    logger.info("--- Running T47 DoD Verification Test ---")
    
    # Ensure test file exists
    if not TEST_AUDIO_FILE.exists():
        logger.error(f"Test audio file not found: {TEST_AUDIO_FILE}")
        sys.exit(1)
        
    logger.info(f"Using test file: {TEST_AUDIO_FILE}")
    
    # Run the preprocessing test
    test_results = test_t47_preprocessing(str(TEST_AUDIO_FILE))
    
    # Ensure results directory exists
    RESULTS_DIR.mkdir(exist_ok=True)
    
    # Save results to a JSON file for record-keeping
    results_path = RESULTS_DIR / "t47_dod_summary.json"
    try:
        with open(results_path, 'w', encoding='utf-8') as f:
            json.dump(test_results, f, indent=4, ensure_ascii=False)
        logger.info(f"📝 Test results saved to: {results_path}")
    except Exception as e:
        logger.error(f"Failed to save test results: {e}")

    # Final verdict
    if test_results.get('success', False):
        logger.info("✅ T47 Test Passed!")
        sys.exit(0)
    else:
        logger.error("❌ T47 Test Failed.")
        logger.error(f"Reason: {test_results.get('error', 'See logs for details')}")
        sys.exit(1)

if __name__ == "__main__":
    run_test()

