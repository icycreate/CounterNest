# Product gallery

Products → Edit → Product Images shows the canonical gallery and X uploaded. Migration 94 folds legacy master images and variant images into that gallery, preserving originals and retaining the current master first. Matching original/URL identities are deduplicated. Existing images require no reupload.

Use Full preview to inspect the original. Edit / crop reloads the original; Replace uploads a new original plus its crop. Make primary moves a photo to the first position. Move earlier/later changes the order. Removing the first photo promotes the next; removing all clears all master image fields. Stored originals remain for old documents and backup. Gallery changes save immediately, independently of Save Product. Server failures leave the previous gallery intact.

Customer detail uses the same canonical collection, Image 1 of X, thumbnails, mobile swipe and full original-image view. Product-label documents remain separate from the photo collection. Variant photos are folded into the shared product gallery when created or changed; deleting a gallery entry does not erase the variant's historical image record.

New media must be stored under the correct workspace/product path. Existing legacy URLs may be retained or reordered but cannot be used to introduce arbitrary foreign replacements. Crop and preview require the image host to allow browser access (CORS); an inaccessible legacy original can still be viewed or replaced by an authorized upload.
