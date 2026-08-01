from typing import Dict, List, Optional
from datetime import datetime, timedelta
from bson import ObjectId
from config.database import (
    users_collection, 
    enrollments_collection, 
    quiz_submissions_collection,
    units_collection
)
import numpy as np

class StudentTracker:
    """Track and aggregate student learning data in real-time"""
    
    def __init__(self, student_id: str):
        self.student_id = ObjectId(student_id)
        self.student_data = None
        self.enrollments = []
        self.quiz_history = []
        
    def load_student_profile(self) -> Dict:
        """Load student basic information"""
        self.student_data = users_collection.find_one({"_id": self.student_id})
        if not self.student_data:
            raise ValueError(f"Student {self.student_id} not found")
        return self.student_data
    
    def get_active_enrollments(self) -> List[Dict]:
        """Get all active course enrollments"""
        self.enrollments = list(enrollments_collection.find({
            "student": self.student_id,
            "completed": False
        }))
        return self.enrollments
    
    def get_quiz_history(self, course_id: Optional[str] = None, 
                         unit_id: Optional[str] = None,
                         limit: int = 50) -> List[Dict]:
        """Get quiz submission history with full details"""
        query = {"submittedBy": self.student_id}
        
        if course_id:
            query["course"] = ObjectId(course_id)
        if unit_id:
            query["unit"] = ObjectId(unit_id)
        
        self.quiz_history = list(
            quiz_submissions_collection.find(query)
            .sort("createdAt", -1)
            .limit(limit)
        )
        return self.quiz_history
    
    def build_feature_sequence(self, course_id: str, max_length: int = 50) -> List[Dict]:
        """Build sequential features for SAKT model from MongoDB data"""
        
        try:
            print(f"📚 Building feature sequence for course {course_id}")
            
            quizzes = self.get_quiz_history(course_id=course_id, limit=max_length)
            
            if not quizzes:
                print(f"⚠️  No quiz history found")
                return []
            
            print(f"   Found {len(quizzes)} quizzes")
            
            # Reverse to get chronological order
            quizzes = list(reversed(quizzes))
            
            features = []
            cumulative_attempts = 0
            cumulative_correct = 0
            
            for idx, quiz in enumerate(quizzes):
                try:
                    # Basic metrics with validation
                    total_questions = int(quiz.get('total', 5))
                    correct_answers = int(quiz.get('score', 0))
                    
                    # Validate data
                    if total_questions <= 0:
                        print(f"   ⚠️  Skipping quiz {idx}: invalid total_questions={total_questions}")
                        continue
                    
                    if correct_answers < 0 or correct_answers > total_questions:
                        print(f"   ⚠️  Fixing invalid score: {correct_answers}/{total_questions}")
                        correct_answers = max(0, min(correct_answers, total_questions))
                    
                    # Calculate accuracy
                    accuracy = float(correct_answers) / float(total_questions) if total_questions > 0 else 0.0
                    
                    # Estimate time spent (2 minutes per question if not available)
                    time_spent = float(quiz.get('timeSpentMinutes', total_questions * 2.0))
                    if time_spent <= 0:
                        time_spent = total_questions * 2.0
                    
                    # Estimate hints used (based on incorrect answers if not tracked)
                    hints_used = float(quiz.get('hintsUsed', max(0, total_questions - correct_answers)))
                    
                    # Calculate derived metrics
                    hint_dependency = hints_used / total_questions if total_questions > 0 else 0.0
                    score_percentage = (correct_answers / total_questions * 100.0) if total_questions > 0 else 0.0
                    efficiency_score = score_percentage / max(time_spent, 0.1)
                    
                    # Determine if all correct
                    is_correct = 1.0 if correct_answers == total_questions else 0.0
                    
                    # Cumulative tracking
                    cumulative_attempts += total_questions
                    cumulative_correct += correct_answers
                    
                    # Determine struggle indicator
                    avg_time_per_question = time_spent / total_questions if total_questions > 0 else 0.0
                    is_struggling = 1.0 if (hint_dependency > 0.5 or avg_time_per_question > 5 or accuracy < 0.5) else 0.0
                    
                    # Get unit ID
                    unit_obj = quiz.get('unit')
                    if unit_obj:
                        unit_id = str(unit_obj)
                    else:
                        unit_id = ''
                    
                    # Difficulty mapping (if not in data, infer from score)
                    if accuracy >= 0.8:
                        difficulty = 0.5  # medium
                    elif accuracy >= 0.6:
                        difficulty = 0.3  # easier
                    else:
                        difficulty = 0.7  # harder next time
                    
                    # Calculate mastery gain
                    if idx > 0 and len(features) > 0:
                        prev_accuracy = features[-1]['feature_vector'][4]
                        mastery_gain = max(0.0, accuracy - prev_accuracy)
                    else:
                        mastery_gain = accuracy
                    
                    # Build feature vector (16 features to match your model)
                    feature_vec = [
                        0.0,  # skill_idx - will be filled by prediction service
                        float(total_questions),  # questions_attempted
                        float(correct_answers),  # questions_correct
                        float(is_correct),  # is_correct (all correct = 1)
                        float(accuracy),  # accuracy_rate
                        float(time_spent),  # time_spent_minutes
                        float(hints_used),  # hints_used
                        float(hint_dependency),  # hint_dependency
                        float(score_percentage / 100.0),  # score_percentage (normalized)
                        float(idx + 1),  # attempt_number
                        float(difficulty),  # question_difficulty
                        float(efficiency_score),  # efficiency_score
                        float(is_struggling),  # is_struggling
                        float(cumulative_attempts),  # total_attempts
                        float(idx + 1),  # units_completed (approximation)
                        float(mastery_gain)  # avg_mastery_gain_per_day
                    ]
                    
                    # Validate feature vector
                    if len(feature_vec) != 16:
                        print(f"   ❌ ERROR: Feature vector has {len(feature_vec)} elements, expected 16")
                        continue
                    
                    # Check for NaN or inf values
                    if any(np.isnan(v) or np.isinf(v) for v in feature_vec):
                        print(f"   ⚠️  Skipping quiz {idx}: contains NaN or Inf values")
                        continue
                    
                    features.append({
                        'feature_vector': feature_vec,
                        'unit_id': unit_id,
                        'quiz_id': str(quiz['_id']),
                        'timestamp': quiz.get('createdAt'),
                        'metadata': {
                            'questions_attempted': int(total_questions),
                            'is_correct': float(is_correct),
                            'hints_used': float(hints_used),
                            'time_spent': float(time_spent),
                            'accuracy': float(accuracy)
                        }
                    })
                    
                except Exception as e:
                    print(f"   ⚠️  Error processing quiz {idx}: {type(e).__name__}: {e}")
                    continue
            
            print(f"   ✅ Built {len(features)} valid feature vectors")
            return features
            
        except Exception as e:
            print(f"❌ Error in build_feature_sequence: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def get_current_performance_summary(self, course_id: str) -> Dict:
        """Get current performance summary for a course"""
        try:
            quizzes = self.get_quiz_history(course_id=course_id, limit=10)
            
            if not quizzes:
                return {
                    "total_quizzes": 0,
                    "avg_score": 0.0,
                    "avg_accuracy": 0.0,
                    "total_questions": 0,
                    "total_correct": 0,
                    "current_mastery": 0.0,
                    "trend": "neutral"
                }
            
            total_questions = sum(int(q.get('total', 0)) for q in quizzes)
            total_correct = sum(int(q.get('score', 0)) for q in quizzes)
            avg_accuracy = total_correct / total_questions if total_questions > 0 else 0.0
            
            # Calculate trend (improving, declining, stable)
            if len(quizzes) >= 3:
                recent_3 = quizzes[:3]
                older_3 = quizzes[3:6] if len(quizzes) >= 6 else quizzes[3:]
                
                recent_scores = [q.get('score', 0) / max(q.get('total', 1), 1) for q in recent_3]
                recent_avg = float(np.mean(recent_scores))
                
                if older_3:
                    older_scores = [q.get('score', 0) / max(q.get('total', 1), 1) for q in older_3]
                    older_avg = float(np.mean(older_scores))
                else:
                    older_avg = recent_avg
                
                if recent_avg > older_avg + 0.1:
                    trend = "improving"
                elif recent_avg < older_avg - 0.1:
                    trend = "declining"
                else:
                    trend = "stable"
            else:
                trend = "neutral"
            
            return {
                "total_quizzes": len(quizzes),
                "avg_score": float(total_correct / len(quizzes)) if quizzes else 0.0,
                "avg_accuracy": float(avg_accuracy),
                "total_questions": int(total_questions),
                "total_correct": int(total_correct),
                "current_mastery": float(avg_accuracy),
                "trend": trend
            }
            
        except Exception as e:
            print(f"❌ Error in get_current_performance_summary: {e}")
            return {
                "total_quizzes": 0,
                "avg_score": 0.0,
                "avg_accuracy": 0.0,
                "total_questions": 0,
                "total_correct": 0,
                "current_mastery": 0.0,
                "trend": "error"
            }
    
    def update_quiz_submission(self, quiz_id: str, submission_data: Dict):
        """Update quiz submission with additional tracking data"""
        try:
            quiz_obj_id = ObjectId(quiz_id)
            
            update_data = {
                "updatedAt": datetime.utcnow()
            }
            
            # Add time spent if provided
            if 'timeSpentMinutes' in submission_data:
                update_data['timeSpentMinutes'] = float(submission_data['timeSpentMinutes'])
            
            # Add hints used if provided
            if 'hintsUsed' in submission_data:
                update_data['hintsUsed'] = int(submission_data['hintsUsed'])
            
            result = quiz_submissions_collection.update_one(
                {"_id": quiz_obj_id},
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                print(f"✅ Updated quiz submission {quiz_id}")
            else:
                print(f"⚠️  Quiz submission {quiz_id} not found or not modified")
                
        except Exception as e:
            print(f"❌ Error updating quiz submission: {e}")