def specialFilter(nums):
    """Count numbers greater than 10 whose first and last digits are odd."""
    count = 0
    for number in nums:
        if number <= 10:
            continue
        digits = str(abs(number))
        if int(digits[0]) % 2 == 1 and int(digits[-1]) % 2 == 1:
            count += 1
    return count
