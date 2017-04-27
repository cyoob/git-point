import React, {Component, PropTypes} from 'react';
import {ScrollView, StyleSheet, ActionSheetIOS} from 'react-native';
import {ListItem} from 'react-native-elements';

import ViewContainer from '../components/ViewContainer';
import SectionList from '../components/SectionList';
import UserListItem from '../components/UserListItem';
import LabelListItem from '../components/LabelListItem';

import colors from '../config/colors';

import {connect} from 'react-redux';
import {editIssue, changeIssueLockStatus} from '../actions/issue';
import {getLabels} from '../actions/repository';

const mapStateToProps = state => ({
  authUser: state.authUser.user,
  repository: state.repository.repository,
  labels: state.repository.labels,
  issue: state.issue.issue,
  isEditingIssue: state.issue.isEditingIssue,
  isPendingLabels: state.repository.isPendingLabels,
});

const mapDispatchToProps = dispatch => ({
  editIssue: (owner, repoName, issueNum, editParams, updateParams) =>
    dispatch(editIssue(owner, repoName, issueNum, editParams, updateParams)),
  changeIssueLockStatus: (owner, repoName, issueNum, currentStatus) =>
    dispatch(changeIssueLockStatus(owner, repoName, issueNum, currentStatus)),
  getLabels: url => dispatch(getLabels(url)),
});

class IssueSettings extends Component {
  componentDidMount() {
    this.props.getLabels(
      this.props.repository.labels_url.replace('{/name}', '')
    );
  }

  render() {
    const {issue, authUser, navigation} = this.props;

    return (
      <ViewContainer>
        <ScrollView>
          <SectionList
            showButton
            buttonTitle="Apply Label"
            buttonAction={() => this.showAddLabelActionSheet()}
            style={{borderBottomWidth: 1, borderBottomColor: colors.grey}}
            noItems={issue.labels.length === 0}
            noItemsMessage="None yet"
            title="LABELS"
          >
            {issue.labels.map((item, i) => (
              <LabelListItem
                label={item}
                key={i}
                removeLabel={labelToRemove =>
                  this.editIssue(
                    {
                      labels: [
                        ...issue.labels
                          .map(label => label.name)
                          .filter(labelName => labelName !== labelToRemove.name),
                      ],
                    },
                    {
                      labels: issue.labels.filter(
                        label => label.name !== labelToRemove.name
                      ),
                    }
                  )}
                />
            ))}
          </SectionList>

          <SectionList
            showButton={
              !issue.assignees.some(
                assignee => assignee.login === authUser.login
              )
            }
            buttonTitle="Assign Yourself"
            buttonAction={() =>
              this.editIssue(
                {
                  assignees: [
                    ...issue.assignees.map(user => user.login),
                    authUser.login,
                  ],
                },
                {assignees: [...issue.assignees, authUser]}
              )}
            noItems={issue.assignees.length === 0}
            noItemsMessage="None yet"
            title="ASSIGNEES"
          >
            {issue.assignees.map((item, i) => (
              <UserListItem
                user={item}
                key={i}
                navigation={navigation}
                icon="x"
                iconAction={userToRemove =>
                  this.editIssue(
                    {
                      assignees: [
                        ...issue.assignees
                          .map(user => user.login)
                          .filter(user => user !== userToRemove),
                      ],
                    },
                    {
                      assignees: issue.assignees.filter(
                        assignee => assignee.login !== userToRemove
                      ),
                    }
                  )}
              />
            ))}
          </SectionList>

          <SectionList title="Actions">
            <ListItem
              title={issue.locked ? 'Unlock issue' : 'Lock Issue'}
              hideChevron
              underlayColor={colors.greyLight}
              titleStyle={styles.listItemTitle}
              onPress={() => this.showLockIssueActionSheet(issue.locked)}
            />
            <ListItem
              title={issue.state === 'open' ? 'Close Issue' : 'Reopen Issue'}
              hideChevron
              underlayColor={colors.greyLight}
              titleStyle={
                issue.state === 'open'
                  ? styles.closeActionTitle
                  : styles.openActionTitle
              }
              onPress={() =>
                this.showChangeIssueStateActionSheet(
                  issue.state === 'open' ? 'close' : 'reopen'
                )}
            />
          </SectionList>
        </ScrollView>
      </ViewContainer>
    );
  }

  editIssue = (editParams, stateChangeParams) => {
    const {issue, repository} = this.props;
    const repoName = repository.name;
    const owner = repository.owner.login;
    const updateStateParams = stateChangeParams
      ? stateChangeParams
      : editParams;

    return this.props.editIssue(
      owner,
      repoName,
      issue.number,
      editParams,
      updateStateParams
    );
  };

  showAddLabelActionSheet = () => {
    if (!this.props.isPendingLabels) {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: `Apply a label to this issue`,
          options: [...this.props.labels.map(label => label.name), 'Cancel'],
          cancelButtonIndex: this.props.labels.length,
        },
        buttonIndex => {
          const {issue, labels} = this.props;
          const labelChoices = [...labels.map(label => label.name)];

          if (buttonIndex !== labelChoices.length && !issue.labels.some(label => label.name === labelChoices[buttonIndex])) {
            this.editIssue(
              {
                labels: [
                  ...issue.labels.map(label => label.name),
                  labelChoices[buttonIndex],
                ],
              },
              {labels: [...issue.labels, labels[buttonIndex]]}
            )
          }
        }
      );
    }
  };

  showChangeIssueStateActionSheet = stateChange => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: `Are you sure you want to ${stateChange} this issue?`,
        options: ['Yes', 'Cancel'],
        destructiveButtonIndex: 0,
        cancelButtonIndex: 1,
      },
      buttonIndex => {
        const newState = stateChange === 'open' ? 'open' : 'closed';

        if (buttonIndex === 0) {
          this.editIssue({state: newState});
        }
      }
    );
  };

  showLockIssueActionSheet = issueLocked => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: `Are you sure you want to ${issueLocked ? 'unlock' : 'lock'} this issue?`,
        options: ['Yes', 'Cancel'],
        cancelButtonIndex: 1,
      },
      buttonIndex => {
        const {issue, repository} = this.props;
        const repoName = repository.name;
        const owner = repository.owner.login;

        if (buttonIndex === 0) {
          this.props.changeIssueLockStatus(
            owner,
            repoName,
            issue.number,
            issueLocked
          );
        }
      }
    );
  };
}

const styles = StyleSheet.create({
  listItemTitle: {
    color: colors.black,
    fontFamily: 'AvenirNext-Medium',
  },
  closeActionTitle: {
    color: colors.red,
    fontFamily: 'AvenirNext-Medium',
  },
  openActionTitle: {
    color: colors.green,
    fontFamily: 'AvenirNext-Medium',
  },
});

IssueSettings.propTypes = {
  editIssue: PropTypes.func,
  changeIssueLockStatus: PropTypes.func,
  getLabels: PropTypes.func,
  authUser: PropTypes.object,
  repository: PropTypes.object,
  labels: PropTypes.array,
  issue: PropTypes.object,
  isEditingIssue: PropTypes.bool,
  isPendingLabels: PropTypes.bool,
  navigation: PropTypes.object,
};

export default connect(mapStateToProps, mapDispatchToProps)(IssueSettings);
