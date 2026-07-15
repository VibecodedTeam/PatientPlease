import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { OverlayPortal } from '../OverlayPortal';
import { MELANOMA_IMAGES } from './internal/melanomaImages';
import { pickRandomImage } from './internal/pickRandomImage';
import styles from './MelanomaImagePopup.module.css';

/**
 * A 340x340 popup, fixed 170px from the left edge and vertically centered, showing
 * the clicked attention point's real document image, or a random melanoma reference
 * image (cropped to fill the box, center preserved) when no document was found for
 * that region. The random fallback is picked once per mount - callers that want a
 * fresh one on reopen should unmount/remount this component (e.g. via a `key` tied
 * to which dot is active).
 * Closes via its own close button or a click on the backdrop outside the box.
 * @param {{ caseDocument?: { imageUrl?: string, imageAltText?: string } | null, onClose: () => void }} props
 */
export function MelanomaImagePopup({ caseDocument, onClose }) {
  const [fallbackImageUrl] = useState(() => pickRandomImage(MELANOMA_IMAGES));
  const imageUrl = caseDocument?.imageUrl ?? fallbackImageUrl;
  const altText = caseDocument?.imageAltText ?? 'Lesion close-up';

  return (
    // overlay-portal: popup must render above the 3D canvas and the rest of the page layout
    <OverlayPortal>
      <div className={styles.backdrop} data-testid="melanoma-popup-backdrop" onClick={onClose}>
        <div
          className={styles.popup}
          data-testid="melanoma-popup-box"
          onClick={(event) => event.stopPropagation()}
        >
          <button type="button" className={styles.closeButton} aria-label="Close" onClick={onClose}>
            ×
          </button>
          <div className={styles.imageWrapper}>
            <img className={styles.image} src={imageUrl} alt={altText} />
          </div>
        </div>
      </div>
    </OverlayPortal>
  );
}

MelanomaImagePopup.propTypes = {
  caseDocument: PropTypes.shape({
    imageUrl: PropTypes.string,
    imageAltText: PropTypes.string,
  }),
  onClose: PropTypes.func.isRequired,
};
