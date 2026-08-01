from typing import Dict, List
from bson import ObjectId
from config.database import units_collection, courses_collection

class DynamicSkillExtractor:
    """Extract skills dynamically from course units"""
    
    def __init__(self):
        self.skill_mapping = {}
        self.skill_to_idx = {}
        self.idx_to_skill = {}
        
    def extract_skills_from_course(self, course_id: str) -> Dict:
        """Extract all skills/topics from a course"""
        course_obj_id = ObjectId(course_id)
        
        # Get all units for this course
        units = list(units_collection.find({"course": course_obj_id}).sort("unitNumber", 1))
        
        skills = {}
        skill_counter = 1
        
        for unit in units:
            unit_id = str(unit['_id'])
            skill_name = unit.get('title', f"Unit {unit.get('unitNumber', skill_counter)}")
            
            skills[skill_counter] = {
                "unit_id": unit_id,
                "unit_number": unit.get('unitNumber', skill_counter),
                "name": skill_name,
                "description": unit.get('description', ''),
                "learning_objectives": unit.get('learningObjectives', []),
                "topics": self._extract_topics_from_unit(unit),
                "estimated_time": unit.get('estimatedTime', {}),
            }
            
            self.skill_to_idx[skill_name] = skill_counter
            self.idx_to_skill[skill_counter] = skill_name
            
            skill_counter += 1
        
        self.skill_mapping = skills
        return skills
    
    def _extract_topics_from_unit(self, unit: Dict) -> List[str]:
        """Extract topics from unit learning objectives and description"""
        topics = []
        
        # From learning objectives
        if 'learningObjectives' in unit:
            topics.extend(unit['learningObjectives'])
        
        return topics[:10]  # Limit to 10 topics
    
    def get_skill_info(self, skill_id: int) -> Dict:
        """Get skill information by ID"""
        return self.skill_mapping.get(skill_id, {
            "name": f"Skill {skill_id}",
            "description": "Unknown skill",
            "topics": [],
            "learning_objectives": []
        })
    
    def get_skill_by_unit_id(self, unit_id: str) -> int:
        """Get skill ID by unit ID"""
        for skill_id, skill_info in self.skill_mapping.items():
            if skill_info.get('unit_id') == unit_id:
                return skill_id
        return 1  # Default to first skill
    
    def get_num_skills(self) -> int:
        """Get total number of skills"""
        return len(self.skill_mapping)