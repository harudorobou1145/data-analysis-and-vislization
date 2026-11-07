def numerical_letter_grade(grades):
    """Convert a list of GPAs to letter grades using the teacher's scale.

    A GPA of 4.0 earns A+; all other passing grade boundaries are strict:
    > 3.7: A, > 3.3: A-, > 3.0: B+, > 2.7: B, > 2.3: B-,
    > 2.0: C+, > 1.7: C, > 1.3: C-, > 1.0: D+, > 0.7: D,
    > 0.0: D-. A GPA of 0.0 earns E.

    Example:
        numerical_letter_grade([4.0, 3, 1.7, 2, 3.5])
        returns ['A+', 'B', 'C-', 'C', 'A-'].
    """
    thresholds = (
        (3.7, "A"),
        (3.3, "A-"),
        (3.0, "B+"),
        (2.7, "B"),
        (2.3, "B-"),
        (2.0, "C+"),
        (1.7, "C"),
        (1.3, "C-"),
        (1.0, "D+"),
        (0.7, "D"),
        (0.0, "D-"),
    )
    result = []
    for grade in grades:
        if grade == 4.0:
            result.append("A+")
            continue
        for threshold, letter in thresholds:
            if grade > threshold:
                result.append(letter)
                break
        else:
            result.append("E")
    return result
