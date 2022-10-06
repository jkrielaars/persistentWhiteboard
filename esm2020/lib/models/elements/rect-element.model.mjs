export class RectElement {
    constructor(options) {
        this.width = options.width || 0;
        this.height = options.height || 0;
        this.x1 = options.x1 || 0;
        this.y1 = options.y1 || 0;
        this.rx = options.rx || 0;
        this.strokeWidth = options.strokeWidth || 2;
        this.strokeColor = options.strokeColor || '#000000';
        this.fill = options.fill || '#000000';
        this.dasharray = options.dasharray || '';
        this.dashoffset = options.dashoffset || 0;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjdC1lbGVtZW50Lm1vZGVsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcHJvamVjdHMvbmctd2hpdGVib2FyZC9zcmMvbGliL21vZGVscy9lbGVtZW50cy9yZWN0LWVsZW1lbnQubW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBRUEsTUFBTSxPQUFPLFdBQVc7SUFZdEIsWUFBWSxPQUFrQztRQUM1QyxJQUFJLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDO1FBQ2hDLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUM7UUFDbEMsSUFBSSxDQUFDLEVBQUUsR0FBRyxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMxQixJQUFJLENBQUMsRUFBRSxHQUFHLE9BQU8sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzFCLElBQUksQ0FBQyxFQUFFLEdBQUcsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDMUIsSUFBSSxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUMsV0FBVyxJQUFJLENBQUMsQ0FBQztRQUM1QyxJQUFJLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQyxXQUFXLElBQUksU0FBUyxDQUFDO1FBQ3BELElBQUksQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksSUFBSSxTQUFTLENBQUM7UUFDdEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUMsU0FBUyxJQUFJLEVBQUUsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxHQUFHLE9BQU8sQ0FBQyxVQUFVLElBQUksQ0FBQyxDQUFDO0lBQzVDLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IElXaGl0ZWJvYXJkRWxlbWVudE9wdGlvbnMgfSBmcm9tICcuLi93aGl0ZWJvYXJkLWVsZW1lbnQtb3B0aW9ucy5tb2RlbCc7XG5cbmV4cG9ydCBjbGFzcyBSZWN0RWxlbWVudCB7XG4gIHdpZHRoOiBudW1iZXI7XG4gIGhlaWdodDogbnVtYmVyO1xuICB4MTogbnVtYmVyO1xuICB5MTogbnVtYmVyO1xuICByeDogbnVtYmVyO1xuICBzdHJva2VXaWR0aDogbnVtYmVyO1xuICBzdHJva2VDb2xvcjogc3RyaW5nO1xuICBmaWxsOiBzdHJpbmc7XG4gIGRhc2hhcnJheTogc3RyaW5nO1xuICBkYXNob2Zmc2V0OiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3Iob3B0aW9uczogSVdoaXRlYm9hcmRFbGVtZW50T3B0aW9ucykge1xuICAgIHRoaXMud2lkdGggPSBvcHRpb25zLndpZHRoIHx8IDA7XG4gICAgdGhpcy5oZWlnaHQgPSBvcHRpb25zLmhlaWdodCB8fCAwO1xuICAgIHRoaXMueDEgPSBvcHRpb25zLngxIHx8IDA7XG4gICAgdGhpcy55MSA9IG9wdGlvbnMueTEgfHwgMDtcbiAgICB0aGlzLnJ4ID0gb3B0aW9ucy5yeCB8fCAwO1xuICAgIHRoaXMuc3Ryb2tlV2lkdGggPSBvcHRpb25zLnN0cm9rZVdpZHRoIHx8IDI7XG4gICAgdGhpcy5zdHJva2VDb2xvciA9IG9wdGlvbnMuc3Ryb2tlQ29sb3IgfHwgJyMwMDAwMDAnO1xuICAgIHRoaXMuZmlsbCA9IG9wdGlvbnMuZmlsbCB8fCAnIzAwMDAwMCc7XG4gICAgdGhpcy5kYXNoYXJyYXkgPSBvcHRpb25zLmRhc2hhcnJheSB8fCAnJztcbiAgICB0aGlzLmRhc2hvZmZzZXQgPSBvcHRpb25zLmRhc2hvZmZzZXQgfHwgMDtcbiAgfVxufVxuIl19