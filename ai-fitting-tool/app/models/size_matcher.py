class SizeMatcher:
    def recommend_size(self, measurements: dict, size_chart: dict) -> dict:
        """
        Recommend size based on body measurements
        
        Args:
            measurements: Dict with chest, waist, hips in cm
            size_chart: Dict mapping sizes to measurement ranges
        
        Returns:
            dict: Recommended size with confidence score
        """
        size_scores = {}
        
        for size, ranges in size_chart.items():
            score = 0
            max_score = 3  # chest, waist, hips
            
            # Check chest fit
            chest_range = self._parse_range(ranges['chest'])
            if chest_range[0] <= measurements['chest'] <= chest_range[1]:
                score += 1
            elif chest_range[0] - 5 <= measurements['chest'] <= chest_range[1] + 5:
                score += 0.5  # Close fit
            
            # Check waist fit
            waist_range = self._parse_range(ranges['waist'])
            if waist_range[0] <= measurements['waist'] <= waist_range[1]:
                score += 1
            elif waist_range[0] - 5 <= measurements['waist'] <= waist_range[1] + 5:
                score += 0.5
            
            # Check hips fit
            hips_range = self._parse_range(ranges['hips'])
            if hips_range[0] <= measurements['hips'] <= hips_range[1]:
                score += 1
            elif hips_range[0] - 5 <= measurements['hips'] <= hips_range[1] + 5:
                score += 0.5
            
            size_scores[size] = (score / max_score) * 100
        
        # Get best match
        best_size = max(size_scores, key=size_scores.get)
        confidence = size_scores[best_size]
        
        # Get alternatives (sizes with >60% confidence)
        alternatives = [
            size for size, score in size_scores.items() 
            if score >= 60 and size != best_size
        ]
        
        return {
            'size': best_size,
            'confidence': round(confidence, 0),
            'alternatives': alternatives
        }
    
    def _parse_range(self, range_str: str) -> tuple:
        """Parse '81-86' into (81, 86)"""
        parts = range_str.split('-')
        return (float(parts[0]), float(parts[1]))
