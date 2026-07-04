class FitAnalyzer:
    def analyze_fit(self, measurements: dict, size_chart: dict, size: str) -> dict:
        """
        Analyze how well a size will fit
        
        Returns:
            dict: Fit analysis with recommendations and warnings
        """
        ranges = size_chart[size]
        
        analysis = {
            'chest_fit': self._check_fit(measurements['chest'], ranges['chest']),
            'waist_fit': self._check_fit(measurements['waist'], ranges['waist']),
            'length_fit': self._check_length(measurements['height'])
        }
        
        # Generate recommendations
        recommendations = []
        warnings = []
        
        if analysis['chest_fit'] == 'tight':
            recommendations.append("Consider sizing up for a more comfortable chest fit")
            warnings.append("This size may feel restrictive around the chest")
        elif analysis['chest_fit'] == 'loose':
            recommendations.append("This will have a relaxed fit around the chest")
        
        if analysis['waist_fit'] == 'tight':
            warnings.append("Waist may feel snug - size up if you prefer looser fit")
        elif analysis['waist_fit'] == 'perfect':
            recommendations.append("Perfect waist fit for a tailored look")
        
        if analysis['length_fit'] == 'short':
            warnings.append("May be shorter than expected for your height")
        elif analysis['length_fit'] == 'long':
            recommendations.append("Good length - may need hemming for petite frames")
        
        return {
            'analysis': analysis,
            'recommendations': recommendations,
            'warnings': warnings
        }
    
    def _check_fit(self, measurement: float, range_str: str) -> str:
        """Determine if measurement is tight/perfect/loose for range"""
        min_val, max_val = [float(x) for x in range_str.split('-')]
        mid = (min_val + max_val) / 2
        
        if measurement < min_val - 2:
            return 'loose'
        elif measurement > max_val + 2:
            return 'tight'
        else:
            return 'perfect'
    
    def _check_length(self, height: float) -> str:
        """Check length fit based on height"""
        if height < 160:
            return 'long'
        elif height > 180:
            return 'short'
        else:
            return 'perfect'
