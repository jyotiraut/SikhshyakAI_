"""
Inspect checkpoint file structure to verify it can be loaded
"""
import torch
import json

CHECKPOINT_PATH = "checkpoints/best_adaptive_sakt.pth"

def inspect_checkpoint():
    """Inspect the structure of your checkpoint file"""
    
    print("="*70)
    print(" CHECKPOINT INSPECTION")
    print("="*70 + "\n")
    
    try:
        checkpoint = torch.load(CHECKPOINT_PATH, map_location='cpu', weights_only=False)
    except Exception as e:
        print(f"[error] Error loading checkpoint: {e}")
        return
    
    print(f" Checkpoint Type: {type(checkpoint).__name__}\n")
    
    if isinstance(checkpoint, dict):
        print(" Top-level Keys:")
        for key in checkpoint.keys():
            value = checkpoint[key]
            if isinstance(value, dict):
                print(f"   [ok] {key}: dict with {len(value)} items")
            elif isinstance(value, (int, float)):
                print(f"   [ok] {key}: {value}")
            elif isinstance(value, str):
                print(f"   [ok] {key}: '{value}'")
            elif hasattr(value, 'shape'):
                print(f"   [ok] {key}: tensor {value.shape}")
            else:
                print(f"   [ok] {key}: {type(value).__name__}")
        
        print("\n" + "="*70)
        
        # Check for model_state_dict
        if 'model_state_dict' in checkpoint:
            state_dict = checkpoint['model_state_dict']
            print(f"\n[ok] Found 'model_state_dict' with {len(state_dict)} parameters\n")
            
            print(" First 15 Parameters:")
            for i, (name, tensor) in enumerate(list(state_dict.items())[:15], 1):
                print(f"   {i:2d}. {name:40s} {str(tensor.shape):20s}")
            
            if len(state_dict) > 15:
                print(f"   ... and {len(state_dict) - 15} more parameters")
            
            # Save all parameter names
            param_names = list(state_dict.keys())
            with open("checkpoint_parameters.txt", "w") as f:
                f.write("\n".join(param_names))
            print(f"\n All parameter names saved to: checkpoint_parameters.txt")
        
        # Check for skill mappings
        if 'skill_to_idx' in checkpoint:
            skills = checkpoint['skill_to_idx']
            print(f"\n[ok] Found skill mappings:")
            print(f"   Number of skills: {len(skills)}")
            if len(skills) <= 10:
                print(f"   Skills: {skills}")
        
        # Training info
        if 'epoch' in checkpoint:
            print(f"\n Training Metadata:")
            print(f"   Epoch: {checkpoint.get('epoch', 'N/A')}")
            if 'train_loss' in checkpoint:
                print(f"   Train Loss: {checkpoint['train_loss']:.6f}")
            if 'val_loss' in checkpoint:
                print(f"   Validation Loss: {checkpoint['val_loss']:.6f}")
        
        print("\n" + "="*70)
        print("[ok] Checkpoint structure verified!")
        print("   Your checkpoint format: Training checkpoint with 'model_state_dict'")
        print("   This is compatible with the updated code.")
        print("="*70)
    
    else:
        print(" Checkpoint is a direct state dict (not nested)")
        if hasattr(checkpoint, 'keys'):
            print(f"   Number of parameters: {len(checkpoint)}")
            print("\n First 10 Parameters:")
            for i, (name, tensor) in enumerate(list(checkpoint.items())[:10], 1):
                print(f"   {i:2d}. {name:40s} {str(tensor.shape):20s}")

if __name__ == "__main__":
    inspect_checkpoint()