import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential # type: ignore
from tensorflow.keras.layers import Conv2D, MaxPooling2D, Flatten, Dense, Dropout # type: ignore
from tensorflow.keras.preprocessing.image import ImageDataGenerator # type: ignore
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint # type: ignore

# Define paths
train_dir = r"C:\Users\varsh\Documents\Dataset\train"
valid_dir = r"C:\Users\varsh\Documents\Dataset\Valid"
test_dir = r"C:\Users\varsh\Documents\Dataset\test"  # Path for the test dataset

# Create ImageDataGenerator instances
train_datagen = ImageDataGenerator(
    rescale=1.0/255,  # Normalize pixel values to [0, 1]
    rotation_range=20,
    width_shift_range=0.2,
    height_shift_range=0.2,
    shear_range=0.2,
    zoom_range=0.2,
    horizontal_flip=True
)

valid_datagen = ImageDataGenerator(rescale=1.0/255)  # Only rescale for validation
test_datagen = ImageDataGenerator(rescale=1.0/255)  # Only rescale for testing

# Create generators
train_generator = train_datagen.flow_from_directory(
    train_dir,
    target_size=(224, 224),  # Resize images to this size
    batch_size=32,            # Set batch size
    class_mode='binary' # Use 'binary' for two classes
)
print(train_generator.class_indices)


valid_generator = valid_datagen.flow_from_directory(
    valid_dir,
    target_size=(224, 224),
    batch_size=32,
    class_mode='binary'
)

test_generator = test_datagen.flow_from_directory(
    test_dir,
    target_size=(224, 224),
    batch_size=32,
    class_mode='binary',
    shuffle=False  # Important to keep the order for evaluation
)

# Build the model
model = Sequential([
    Conv2D(32, (3, 3), activation='relu', input_shape=(224, 224, 3)),
    MaxPooling2D(pool_size=(2, 2)),
    Conv2D(64, (3, 3), activation='relu'),
    MaxPooling2D(pool_size=(2, 2)),
    Flatten(),
    Dense(128, activation='relu'),
    Dropout(0.5),
    Dense(1, activation='sigmoid')  # Use 'sigmoid' for binary classification
])

# Compile the model
model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])

# Callbacks
checkpoint = ModelCheckpoint(
    filepath='model.keras',
    monitor='val_loss',
    save_best_only=True,
    verbose=1
)
earlystop = EarlyStopping(patience=10, verbose=1)

# Calculate steps per epoch
steps_per_epoch = len(train_generator)
validation_steps = valid_generator.samples // valid_generator.batch_size

# Train the model
history = model.fit(
    train_generator,
    validation_data=valid_generator,
    epochs=10,  
    steps_per_epoch=50,  # Fixed steps per epoch
    validation_steps=50,   # Fixed validation steps
    callbacks=[checkpoint, earlystop],
    verbose=1
)

# Evaluate the model
test_loss, test_accuracy = model.evaluate(test_generator, steps=test_generator.samples // test_generator.batch_size)
print(f"Test Loss: {test_loss}, Test Accuracy: {test_accuracy}")

# Save the model
model.save('final_model.keras')
print("Model successfully saved as 'final_model.keras'") 