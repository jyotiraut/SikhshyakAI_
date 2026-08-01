import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np


class EnhancedAdaptiveSAKT(nn.Module):
    """
    Self-Attentive Knowledge Tracing (SAKT) model for adaptive learning
    
    Predicts:
    - Mastery score (0-1)
    - Next question difficulty (0-1) 
    - Learning pace (0-1)
    - Next skill to learn
    """
    
    def __init__(self, num_skills, embed_dim=128, n_heads=8, hidden_dim=256, n_layers=3, dropout=0.1):
        super().__init__()
        
        self.num_skills = num_skills
        self.embed_dim = embed_dim
        
        # Skill embedding layer
        self.skill_embed = nn.Embedding(num_skills + 1, embed_dim, padding_idx=0)
        
        # Feature projection (16 features total: skill_idx + 15 other features)
        # Input: [skill_idx, questions_attempted, questions_correct, is_correct, 
        #         accuracy_rate, time_spent, hints_used, hint_dependency, 
        #         score_percentage, attempt_number, question_difficulty, 
        #         efficiency_score, is_struggling, total_attempts, 
        #         units_completed, avg_mastery_gain]
        self.feature_linear = nn.Linear(embed_dim + 15, embed_dim)
        
        # Positional encoding
        self.pos_encoder = PositionalEncoding(embed_dim, dropout)
        
        # Transformer encoder with masking support
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=embed_dim,
            nhead=n_heads,
            dim_feedforward=hidden_dim,
            dropout=dropout,
            batch_first=True,
            norm_first=True
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, n_layers)
        
        # Multi-head attention for importance weighting
        self.attention = nn.MultiheadAttention(
            embed_dim, 
            n_heads, 
            dropout=dropout, 
            batch_first=True
        )
        
        # Prediction heads
        # 1. Mastery score prediction
        self.mastery_head = nn.Sequential(
            nn.Linear(embed_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
            nn.Sigmoid()  # Output: 0-1
        )
        
        # 2. Next question difficulty prediction
        self.difficulty_head = nn.Sequential(
            nn.Linear(embed_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
            nn.Sigmoid()  # Output: 0-1 (maps to easy/medium/hard)
        )
        
        # 3. Learning pace prediction
        self.pace_head = nn.Sequential(
            nn.Linear(embed_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
            nn.Sigmoid()  # Output: 0-1
        )
        
        # 4. Next skill prediction
        self.next_skill_head = nn.Sequential(
            nn.Linear(embed_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, num_skills)  # Logits for each skill
        )
        
        # Additional interpretability layer
        self.decision_attention = nn.Linear(embed_dim, 1)
        
    def forward(self, x, mask=None):
        """
        Forward pass through the SAKT model
        
        Args:
            x: (batch_size, seq_len, 16) - Feature tensor
               - x[:, :, 0] = skill indices (int)
               - x[:, :, 1:] = 15 numerical features (float)
            mask: (batch_size, seq_len) - Binary mask (1 = valid, 0 = padding)
        
        Returns:
            mastery: (batch_size,) - Mastery score prediction
            difficulty: (batch_size,) - Next question difficulty
            pace: (batch_size,) - Learning pace
            next_skill: (batch_size, num_skills) - Next skill logits
            attn_weights: Attention weights for interpretability
        """
        batch_size, seq_len, num_features = x.shape
        
        # Extract skill indices (first column)
        skill_indices = x[:, :, 0].long()  # (batch_size, seq_len)
        
        # Embed skills
        skill_emb = self.skill_embed(skill_indices)  # (batch_size, seq_len, embed_dim)
        
        # Extract other features (columns 1-15)
        other_features = x[:, :, 1:]  # (batch_size, seq_len, 15)
        
        # Combine skill embeddings with other features
        x_combined = torch.cat([skill_emb, other_features], dim=-1)  # (batch_size, seq_len, embed_dim + 15)
        
        # Project to embed_dim
        x_combined = self.feature_linear(x_combined)  # (batch_size, seq_len, embed_dim)
        
        # Add positional encoding
        x_combined = self.pos_encoder(x_combined)
        
        # Create attention mask for transformer
        # Transformer expects True for positions to IGNORE
        if mask is not None:
            attn_mask = (mask == 0)  # Convert 1=valid, 0=padding to True=ignore, False=attend
        else:
            attn_mask = None
        
        # Pass through transformer encoder
        h = self.transformer(x_combined, src_key_padding_mask=attn_mask)
        
        # Apply multi-head attention
        if mask is not None:
            attn_output, attn_weights = self.attention(h, h, h, key_padding_mask=attn_mask)
        else:
            attn_output, attn_weights = self.attention(h, h, h)
        
        # Extract final state (last valid position in sequence)
        if mask is not None:
            # Find last valid position for each sequence in batch
            seq_lengths = mask.sum(dim=1).long() - 1  # -1 for 0-indexing
            seq_lengths = torch.clamp(seq_lengths, min=0)  # Ensure non-negative
            batch_indices = torch.arange(batch_size, device=x.device)
            state = attn_output[batch_indices, seq_lengths]  # (batch_size, embed_dim)
        else:
            state = attn_output[:, -1, :]  # (batch_size, embed_dim)
        
        # Generate predictions from final state
        mastery = self.mastery_head(state).squeeze(-1)        # (batch_size,)
        difficulty = self.difficulty_head(state).squeeze(-1)  # (batch_size,)
        pace = self.pace_head(state).squeeze(-1)              # (batch_size,)
        next_skill = self.next_skill_head(state)              # (batch_size, num_skills)
        
        return mastery, difficulty, pace, next_skill, attn_weights


class PositionalEncoding(nn.Module):
    """
    Positional encoding for transformer
    Adds position information to the sequence
    """
    
    def __init__(self, d_model, dropout=0.1, max_len=5000):
        super().__init__()
        self.dropout = nn.Dropout(p=dropout)
        
        # Create positional encoding matrix
        position = torch.arange(max_len).unsqueeze(1)  # (max_len, 1)
        div_term = torch.exp(torch.arange(0, d_model, 2) * (-np.log(10000.0) / d_model))
        
        pe = torch.zeros(1, max_len, d_model)  # (1, max_len, d_model)
        pe[0, :, 0::2] = torch.sin(position * div_term)  # Even indices
        pe[0, :, 1::2] = torch.cos(position * div_term)  # Odd indices
        
        # Register as buffer (not a parameter, but part of state)
        self.register_buffer('pe', pe)
    
    def forward(self, x):
        """
        Args:
            x: (batch_size, seq_len, d_model)
        Returns:
            x with positional encoding added
        """
        x = x + self.pe[:, :x.size(1), :]
        return self.dropout(x)


def read_checkpoint(checkpoint_path: str, device='cpu'):
    """
    Read a training checkpoint and return (state_dict, metadata).

    `weights_only=False` is required because the checkpoint stores numpy scalars
    in its skill maps; torch >= 2.6 defaults that flag to True and refuses to
    unpickle them. The file is a local training artefact, not untrusted input.
    """
    checkpoint = torch.load(checkpoint_path, map_location=device, weights_only=False)

    if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
        state_dict = checkpoint["model_state_dict"]
        metadata = {k: v for k, v in checkpoint.items()
                    if k not in ("model_state_dict", "optimizer_state_dict")}
    else:
        state_dict = checkpoint
        metadata = {}

    return state_dict, metadata


def infer_architecture(state_dict) -> dict:
    """
    Recover the architecture from the weights themselves.

    The number of skills is baked into the trained tensors, so it must be read
    from them rather than computed from the course being served — a mismatch is
    an unrecoverable size error, not something to guess at.
    """
    embed_weight = state_dict["skill_embed.weight"]          # (num_skills + 1, embed_dim)
    num_skills = int(embed_weight.shape[0]) - 1
    embed_dim = int(embed_weight.shape[1])

    head_keys = [k for k in state_dict if k.startswith("next_skill_head.") and k.endswith(".weight")]
    hidden_dim = None
    if head_keys:
        first = min(head_keys, key=lambda k: int(k.split(".")[1]))
        hidden_dim = int(state_dict[first].shape[0])

    n_layers = 1 + max(
        (int(k.split(".")[2]) for k in state_dict if k.startswith("transformer.layers.")),
        default=0,
    )

    return {
        "num_skills": num_skills,
        "embed_dim": embed_dim,
        "hidden_dim": hidden_dim or 256,
        "n_layers": n_layers,
    }


def load_sakt_model(checkpoint_path: str, num_skills: int = None, device='cpu'):
    """
    Load a trained SAKT model.

    Raises on failure instead of silently returning a randomly initialised
    network — an untrained model that looks loaded is worse than no model,
    because its predictions look authoritative and are noise.

    Args:
        checkpoint_path: path to the .pth file
        num_skills: ignored if the checkpoint declares its own; kept for callers
        device: 'cpu' or 'cuda'

    Returns:
        (model in eval mode, metadata dict)
    """
    state_dict, metadata = read_checkpoint(checkpoint_path, device)
    architecture = infer_architecture(state_dict)

    if num_skills is not None and num_skills != architecture["num_skills"]:
        # Not fatal: the caller's skill count simply does not apply. The trained
        # tensors win, and the caller has to map its skills into that space.
        print(
            f"[sakt] checkpoint was trained with {architecture['num_skills']} skills; "
            f"ignoring requested num_skills={num_skills}"
        )

    model = EnhancedAdaptiveSAKT(
        num_skills=architecture["num_skills"],
        embed_dim=architecture["embed_dim"],
        hidden_dim=architecture["hidden_dim"],
        n_layers=architecture["n_layers"],
    )
    model.load_state_dict(state_dict)  # strict: a partial load is a bug, not a warning
    model.to(device)
    model.eval()

    metadata.update(architecture)
    return model, metadata


# Helper function for inference
def predict_student_state(model, feature_sequence, device='cpu'):
    """
    Make prediction for a single student
    
    Args:
        model: Trained SAKT model
        feature_sequence: List of feature vectors (seq_len, 16)
        device: 'cpu' or 'cuda'
    
    Returns:
        Dictionary with predictions
    """
    model.eval()
    
    # Convert to tensor
    if isinstance(feature_sequence, list):
        feature_sequence = torch.tensor(feature_sequence, dtype=torch.float32)
    
    # Add batch dimension
    x = feature_sequence.unsqueeze(0).to(device)  # (1, seq_len, 16)
    
    with torch.no_grad():
        mastery, difficulty, pace, next_skill_logits, _ = model(x)
    
    # Extract predictions
    predictions = {
        'mastery_score': float(mastery.item()),
        'difficulty_score': float(difficulty.item()),
        'pace_score': float(pace.item()),
        'predicted_next_skill': int(next_skill_logits.argmax(dim=1).item()),
        'next_skill_probabilities': next_skill_logits.softmax(dim=1).squeeze().cpu().numpy().tolist()
    }
    
    return predictions


# Example usage
if __name__ == "__main__":
    # Test model creation
    num_skills = 5
    batch_size = 2
    seq_len = 10
    
    print("Creating SAKT model...")
    model = EnhancedAdaptiveSAKT(num_skills=num_skills)
    
    print(f"Model parameters: {sum(p.numel() for p in model.parameters()):,}")
    
    # Create dummy input
    x = torch.randn(batch_size, seq_len, 16)
    x[:, :, 0] = torch.randint(1, num_skills + 1, (batch_size, seq_len)).float()
    
    mask = torch.ones(batch_size, seq_len)
    
    # Forward pass
    print("\nTesting forward pass...")
    mastery, difficulty, pace, next_skill, attn_weights = model(x, mask)
    
    print(f"[ok] Mastery shape: {mastery.shape}")
    print(f"[ok] Difficulty shape: {difficulty.shape}")
    print(f"[ok] Pace shape: {pace.shape}")
    print(f"[ok] Next skill shape: {next_skill.shape}")
    print(f"[ok] Attention weights shape: {attn_weights.shape}")
    
    print("\nSample predictions:")
    print(f"Mastery: {mastery[0].item():.4f}")
    print(f"Difficulty: {difficulty[0].item():.4f}")
    print(f"Pace: {pace[0].item():.4f}")
    print(f"Next skill: {next_skill[0].argmax().item()}")